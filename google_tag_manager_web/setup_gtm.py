#!/usr/bin/env python3
"""
Builds and provisions GTM Web (GTM-KDFCRJM5) and Server (GTM-WBDK738X) containers
for https://nielsoverwijn.dev and https://sgtm.nielsoverwijn.dev.

Usage:
  1. Generate ready-to-import container JSON files:
     python3 setup_gtm.py --export-only

  2. Provision directly to GTM Workspace via Tag Manager API v2:
     python3 setup_gtm.py --apply --access-token "$(gcloud auth application-default print-access-token)"
"""

import argparse
import datetime
import json
import os
import sys
import urllib.error
import urllib.request

ACCOUNT_ID = "6372651746"

WEB_CONTAINER_ID = "261906578"
WEB_PUBLIC_ID = "GTM-KDFCRJM5"
WEB_WORKSPACE_ID = "7"

SERVER_CONTAINER_ID = "261904107"
SERVER_PUBLIC_ID = "GTM-WBDK738X"
SERVER_WORKSPACE_ID = "6"

# Measurement & Conversion Identifiers
GA4_WEB_MEASUREMENT_ID = "G-L2SXXWZ06F"
GA4_SGTM_MEASUREMENT_ID = "G-RVBC6TKCR8"
SGTM_SERVER_URL = "https://sgtm.nielsoverwijn.dev"

ADS_CONVERSION_ID = "384288103"
ADS_LABEL_PURCHASE = "88-pCIGZi6IdEOeKn7cB"
ADS_LABEL_ADD_TO_CART = "4ts1CIeZi6IdEOeKn7cB"
ADS_LABEL_BEGIN_CHECKOUT = "zJkcCImHjaIdEOeKn7cB"
ADS_LABEL_SUBMIT_LEAD_FORM = "MkmMCISZi6IdEOeKn7cB"

CM360_ADVERTISER_ID = "5216934"

ECOMMERCE_EVENTS_REGEX = (
    "^(add_to_cart|remove_from_cart|view_item_list|select_item|view_item|"
    "begin_checkout|add_shipping_info|add_payment_info|purchase|"
    "view_promotion|select_promotion)$"
)


def param(key: str, value: str, ptype: str = "TEMPLATE") -> dict:
    return {"type": ptype, "key": key, "value": value}


def map_entry(param_name: str, param_val: str) -> dict:
    return {
        "type": "MAP",
        "map": [
            param("parameter", param_name, "TEMPLATE"),
            param("parameterValue", param_val, "TEMPLATE"),
        ],
    }


def dlv_variable(var_id: str, name: str, dl_path: str, account_id: str, container_id: str) -> dict:
    return {
        "accountId": account_id,
        "containerId": container_id,
        "variableId": var_id,
        "name": name,
        "type": "v",
        "parameter": [
            param("dataLayerVersion", "2", "INTEGER"),
            param("setDefaultValue", "false", "BOOLEAN"),
            param("name", dl_path, "TEMPLATE"),
        ],
        "fingerprint": "0000000000000",
        "formatValue": {},
    }


def const_variable(var_id: str, name: str, val: str, account_id: str, container_id: str) -> dict:
    return {
        "accountId": account_id,
        "containerId": container_id,
        "variableId": var_id,
        "name": name,
        "type": "c",
        "parameter": [param("value", val, "TEMPLATE")],
        "fingerprint": "0000000000000",
        "formatValue": {},
    }


def custom_event_trigger(
    trig_id: str, name: str, event_val: str, match_type: str, account_id: str, container_id: str, extra_filters=None
) -> dict:
    t = {
        "accountId": account_id,
        "containerId": container_id,
        "triggerId": trig_id,
        "name": name,
        "type": "CUSTOM_EVENT",
        "customEventFilter": [
            {
                "type": match_type,
                "parameter": [
                    param("arg0", "{{_event}}", "TEMPLATE"),
                    param("arg1", event_val, "TEMPLATE"),
                ],
            }
        ],
        "fingerprint": "0000000000000",
    }
    if extra_filters:
        t["filter"] = extra_filters
    return t


def build_web_container_export() -> dict:
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    acc = ACCOUNT_ID
    cid = WEB_CONTAINER_ID

    variables = [
        # Constants
        const_variable("1", "Const - GA4 Measurement ID (Web)", GA4_WEB_MEASUREMENT_ID, acc, cid),
        const_variable("2", "Const - GA4 Measurement ID (sGTM)", GA4_SGTM_MEASUREMENT_ID, acc, cid),
        const_variable("3", "Const - Server Container URL", SGTM_SERVER_URL, acc, cid),
        const_variable("4", "Const - Google Ads Conversion ID", ADS_CONVERSION_ID, acc, cid),
        const_variable("5", "Const - Google Ads Label - Purchase", ADS_LABEL_PURCHASE, acc, cid),
        const_variable("6", "Const - Google Ads Label - Add to Cart", ADS_LABEL_ADD_TO_CART, acc, cid),
        const_variable("7", "Const - Google Ads Label - Begin Checkout", ADS_LABEL_BEGIN_CHECKOUT, acc, cid),
        const_variable("8", "Const - Google Ads Label - Submit Lead Form", ADS_LABEL_SUBMIT_LEAD_FORM, acc, cid),
        # Ecommerce Data Layer Variables
        dlv_variable("10", "DLV - ecommerce.currency", "ecommerce.currency", acc, cid),
        dlv_variable("11", "DLV - ecommerce.value", "ecommerce.value", acc, cid),
        dlv_variable("12", "DLV - ecommerce.transaction_id", "ecommerce.transaction_id", acc, cid),
        dlv_variable("13", "DLV - ecommerce.items", "ecommerce.items", acc, cid),
        dlv_variable("14", "DLV - ecommerce.shipping_tier", "ecommerce.shipping_tier", acc, cid),
        dlv_variable("15", "DLV - ecommerce.payment_type", "ecommerce.payment_type", acc, cid),
        # User & Lead Data Layer Variables
        dlv_variable("20", "DLV - user.email", "user.email", acc, cid),
        dlv_variable("21", "DLV - user.phone_number", "user.phone_number", acc, cid),
        dlv_variable("22", "DLV - user.address.first_name", "user.address.first_name", acc, cid),
        dlv_variable("23", "DLV - user.address.last_name", "user.address.last_name", acc, cid),
        dlv_variable("24", "DLV - user.address.street", "user.address.street", acc, cid),
        dlv_variable("25", "DLV - user.address.city", "user.address.city", acc, cid),
        dlv_variable("26", "DLV - user.address.region", "user.address.region", acc, cid),
        dlv_variable("27", "DLV - user.address.postal_code", "user.address.postal_code", acc, cid),
        dlv_variable("28", "DLV - user.address.country", "user.address.country", acc, cid),
        dlv_variable("29", "DLV - subscriber_email", "subscriber_email", acc, cid),
        dlv_variable("30", "DLV - subscriber_name", "subscriber_name", acc, cid),
        # Rocket Loader / Custom Attribute Data Layer Variables
        dlv_variable("31", "DLV - attributes.id", "attributes.id", acc, cid),
        dlv_variable("32", "DLV - attributes.region", "attributes.region", acc, cid),
        # User-Provided Data Variables (Enhanced Conversions)
        {
            "accountId": acc,
            "containerId": cid,
            "variableId": "40",
            "name": "UPD - User Provided Data (Customer)",
            "type": "awec",
            "parameter": [
                param("mode", "MANUAL", "TEMPLATE"),
                param("email", "{{DLV - user.email}}", "TEMPLATE"),
                param("phone_number", "{{DLV - user.phone_number}}", "TEMPLATE"),
                param("first_name", "{{DLV - user.address.first_name}}", "TEMPLATE"),
                param("last_name", "{{DLV - user.address.last_name}}", "TEMPLATE"),
                param("street", "{{DLV - user.address.street}}", "TEMPLATE"),
                param("city", "{{DLV - user.address.city}}", "TEMPLATE"),
                param("region", "{{DLV - user.address.region}}", "TEMPLATE"),
                param("postal_code", "{{DLV - user.address.postal_code}}", "TEMPLATE"),
                param("country", "{{DLV - user.address.country}}", "TEMPLATE"),
            ],
            "fingerprint": "0000000000000",
            "formatValue": {},
        },
        {
            "accountId": acc,
            "containerId": cid,
            "variableId": "41",
            "name": "UPD - User Provided Data (Lead Form)",
            "type": "awec",
            "parameter": [
                param("mode", "MANUAL", "TEMPLATE"),
                param("email", "{{DLV - subscriber_email}}", "TEMPLATE"),
            ],
            "fingerprint": "0000000000000",
            "formatValue": {},
        },
    ]

    triggers = [
        custom_event_trigger("50", "CE - All Ecommerce Events", ECOMMERCE_EVENTS_REGEX, "MATCH_REGEX", acc, cid),
        custom_event_trigger("51", "CE - purchase", "purchase", "EQUALS", acc, cid),
        custom_event_trigger("52", "CE - add_to_cart", "add_to_cart", "EQUALS", acc, cid),
        custom_event_trigger("53", "CE - begin_checkout", "begin_checkout", "EQUALS", acc, cid),
        custom_event_trigger("54", "CE - newsletter_signup", "newsletter_signup", "EQUALS", acc, cid),
    ]

    tags = [
        # 1. Conversion Linker (All Pages = 2147479553, Initialization = 2147479573)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "100",
            "name": "Conversion Linker",
            "type": "gclidw",
            "parameter": [
                param("enableCrossDomain", "false", "BOOLEAN"),
                param("enableUrlPassthrough", "true", "BOOLEAN"),
                param("enableCookieOverrides", "false", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["2147479573"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 2. Google Tag - GA4 Web (Direct)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "101",
            "name": "Google Tag - GA4 Web (G-L2SXXWZ06F)",
            "type": "googtag",
            "parameter": [
                param("tagId", "{{Const - GA4 Measurement ID (Web)}}", "TEMPLATE"),
                {
                    "type": "LIST",
                    "key": "configSettingsTable",
                    "list": [
                        map_entry("send_page_view", "true"),
                        map_entry("allow_enhanced_conversions", "true"),
                        map_entry("id_test", "{{DLV - attributes.id}}"),
                        map_entry("test_region", "{{DLV - attributes.region}}"),
                    ],
                },
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["2147479573"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 3. Google Tag - GA4 sGTM (Routes to https://sgtm.nielsoverwijn.dev)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "102",
            "name": "Google Tag - GA4 sGTM (G-RVBC6TKCR8)",
            "type": "googtag",
            "parameter": [
                param("tagId", "{{Const - GA4 Measurement ID (sGTM)}}", "TEMPLATE"),
                {
                    "type": "LIST",
                    "key": "configSettingsTable",
                    "list": [
                        map_entry("server_container_url", "{{Const - Server Container URL}}"),
                        map_entry("send_page_view", "true"),
                        map_entry("allow_enhanced_conversions", "true"),
                        map_entry("id_test", "{{DLV - attributes.id}}"),
                        map_entry("test_region", "{{DLV - attributes.region}}"),
                    ],
                },
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["2147479573"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 4. GA4 Event - Ecommerce & Lead (Web)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "103",
            "name": "GA4 Event - Ecommerce & Lead (Web)",
            "type": "gaawe",
            "parameter": [
                param("measurementIdOverride", "{{Const - GA4 Measurement ID (Web)}}", "TEMPLATE"),
                param("eventName", "{{Event}}", "TEMPLATE"),
                param("sendEcommerceData", "true", "BOOLEAN"),
                param("getEcommerceDataFrom", "dataLayer", "TEMPLATE"),
                param("enhancedUserId", "true", "BOOLEAN"),
                param("userDataVariable", "{{UPD - User Provided Data (Customer)}}", "TEMPLATE"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["50", "54"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 5. GA4 Event - Ecommerce & Lead (sGTM)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "104",
            "name": "GA4 Event - Ecommerce & Lead (sGTM)",
            "type": "gaawe",
            "parameter": [
                param("measurementIdOverride", "{{Const - GA4 Measurement ID (sGTM)}}", "TEMPLATE"),
                param("eventName", "{{Event}}", "TEMPLATE"),
                param("sendEcommerceData", "true", "BOOLEAN"),
                param("getEcommerceDataFrom", "dataLayer", "TEMPLATE"),
                param("enhancedUserId", "true", "BOOLEAN"),
                param("userDataVariable", "{{UPD - User Provided Data (Customer)}}", "TEMPLATE"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["50", "54"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 6. Google Ads - Purchase Conversion (Web)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "110",
            "name": "Google Ads - Conversion - Purchase (Web)",
            "type": "awct",
            "parameter": [
                param("conversionId", "{{Const - Google Ads Conversion ID}}", "TEMPLATE"),
                param("conversionLabel", "{{Const - Google Ads Label - Purchase}}", "TEMPLATE"),
                param("conversionValue", "{{DLV - ecommerce.value}}", "TEMPLATE"),
                param("currencyCode", "{{DLV - ecommerce.currency}}", "TEMPLATE"),
                param("orderId", "{{DLV - ecommerce.transaction_id}}", "TEMPLATE"),
                param("enableConversionLinker", "true", "BOOLEAN"),
                param("conversionCookiePrefix", "_gcl", "TEMPLATE"),
                param("enableEnhancedConversion", "true", "BOOLEAN"),
                param("cssProvidedEnhancedConversionValue", "{{UPD - User Provided Data (Customer)}}", "TEMPLATE"),
                param("enableProductReporting", "true", "BOOLEAN"),
                param("productReportingDataSource", "DATA_LAYER", "TEMPLATE"),
                param("enableNewCustomerReporting", "false", "BOOLEAN"),
                param("enableShippingData", "false", "BOOLEAN"),
                param("rdp", "false", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["51"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 7. Google Ads - Add to Cart Conversion (Web)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "111",
            "name": "Google Ads - Conversion - Add to Cart (Web)",
            "type": "awct",
            "parameter": [
                param("conversionId", "{{Const - Google Ads Conversion ID}}", "TEMPLATE"),
                param("conversionLabel", "{{Const - Google Ads Label - Add to Cart}}", "TEMPLATE"),
                param("conversionValue", "{{DLV - ecommerce.value}}", "TEMPLATE"),
                param("currencyCode", "{{DLV - ecommerce.currency}}", "TEMPLATE"),
                param("enableConversionLinker", "true", "BOOLEAN"),
                param("conversionCookiePrefix", "_gcl", "TEMPLATE"),
                param("enableEnhancedConversion", "false", "BOOLEAN"),
                param("enableProductReporting", "true", "BOOLEAN"),
                param("productReportingDataSource", "DATA_LAYER", "TEMPLATE"),
                param("enableNewCustomerReporting", "false", "BOOLEAN"),
                param("enableShippingData", "false", "BOOLEAN"),
                param("rdp", "false", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["52"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 8. Google Ads - Begin Checkout Conversion (Web)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "112",
            "name": "Google Ads - Conversion - Begin Checkout (Web)",
            "type": "awct",
            "parameter": [
                param("conversionId", "{{Const - Google Ads Conversion ID}}", "TEMPLATE"),
                param("conversionLabel", "{{Const - Google Ads Label - Begin Checkout}}", "TEMPLATE"),
                param("conversionValue", "{{DLV - ecommerce.value}}", "TEMPLATE"),
                param("currencyCode", "{{DLV - ecommerce.currency}}", "TEMPLATE"),
                param("enableConversionLinker", "true", "BOOLEAN"),
                param("conversionCookiePrefix", "_gcl", "TEMPLATE"),
                param("enableEnhancedConversion", "true", "BOOLEAN"),
                param("cssProvidedEnhancedConversionValue", "{{UPD - User Provided Data (Customer)}}", "TEMPLATE"),
                param("enableProductReporting", "true", "BOOLEAN"),
                param("productReportingDataSource", "DATA_LAYER", "TEMPLATE"),
                param("enableNewCustomerReporting", "false", "BOOLEAN"),
                param("enableShippingData", "false", "BOOLEAN"),
                param("rdp", "false", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["53"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 9. Google Ads - Submit Lead Form Conversion (Web)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "113",
            "name": "Google Ads - Conversion - Submit Lead Form (Web)",
            "type": "awct",
            "parameter": [
                param("conversionId", "{{Const - Google Ads Conversion ID}}", "TEMPLATE"),
                param("conversionLabel", "{{Const - Google Ads Label - Submit Lead Form}}", "TEMPLATE"),
                param("enableConversionLinker", "true", "BOOLEAN"),
                param("conversionCookiePrefix", "_gcl", "TEMPLATE"),
                param("enableEnhancedConversion", "true", "BOOLEAN"),
                param("cssProvidedEnhancedConversionValue", "{{UPD - User Provided Data (Lead Form)}}", "TEMPLATE"),
                param("enableProductReporting", "false", "BOOLEAN"),
                param("enableNewCustomerReporting", "false", "BOOLEAN"),
                param("enableShippingData", "false", "BOOLEAN"),
                param("rdp", "false", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["54"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 10. Google Ads User-Provided Data Event (Web - Lead Form)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "114",
            "name": "Google Ads - User-Provided Data Event (Lead Form)",
            "type": "awud",
            "parameter": [
                param("conversionId", "{{Const - Google Ads Conversion ID}}", "TEMPLATE"),
                param("userDataVariable", "{{UPD - User Provided Data (Lead Form)}}", "TEMPLATE"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["54"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
    ]

    built_in_vars = [
        {"accountId": acc, "containerId": cid, "type": "PAGE_URL", "name": "Page URL"},
        {"accountId": acc, "containerId": cid, "type": "PAGE_HOSTNAME", "name": "Page Hostname"},
        {"accountId": acc, "containerId": cid, "type": "PAGE_PATH", "name": "Page Path"},
        {"accountId": acc, "containerId": cid, "type": "REFERRER", "name": "Referrer"},
        {"accountId": acc, "containerId": cid, "type": "EVENT", "name": "Event"},
        {"accountId": acc, "containerId": cid, "type": "CLICK_CLASSES", "name": "Click Classes"},
        {"accountId": acc, "containerId": cid, "type": "CLICK_URL", "name": "Click URL"},
        {"accountId": acc, "containerId": cid, "type": "CLICK_TEXT", "name": "Click Text"},
    ]

    return {
        "exportFormatVersion": 2,
        "exportTime": now_str,
        "containerVersion": {
            "path": f"accounts/{acc}/containers/{cid}/versions/0",
            "accountId": acc,
            "containerId": cid,
            "containerVersionId": "0",
            "container": {
                "path": f"accounts/{acc}/containers/{cid}",
                "accountId": acc,
                "containerId": cid,
                "name": "nielsoverwijn.dev",
                "publicId": WEB_PUBLIC_ID,
                "usageContext": ["WEB"],
                "fingerprint": "0000000000000",
                "tagManagerUrl": f"https://tagmanager.google.com/#/container/accounts/{acc}/containers/{cid}/workspaces?apiLink=container",
                "features": {
                    "supportUserPermissions": True,
                    "supportEnvironments": True,
                    "supportWorkspaces": True,
                    "supportGtagConfigs": False,
                    "supportBuiltInVariables": True,
                    "supportClients": False,
                    "supportFolders": True,
                    "supportTags": True,
                    "supportTemplates": True,
                    "supportTriggers": True,
                    "supportVariables": True,
                    "supportVersions": True,
                    "supportZones": True,
                    "supportTransformations": False,
                },
                "tagIds": [WEB_PUBLIC_ID],
            },
            "tag": tags,
            "trigger": triggers,
            "variable": variables,
            "builtInVariable": built_in_vars,
            "fingerprint": "0000000000000",
            "tagManagerUrl": f"https://tagmanager.google.com/#/versions/accounts/{acc}/containers/{cid}/versions/0?apiLink=version",
        },
    }


def build_server_container_export() -> dict:
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    acc = ACCOUNT_ID
    cid = SERVER_CONTAINER_ID

    clients = [
        {
            "accountId": acc,
            "containerId": cid,
            "clientId": "1",
            "name": "GA4",
            "type": "gaaw_client",
            "parameter": [
                param("activateDefaultPaths", "true", "BOOLEAN"),
                param("cookieManagement", "server", "TEMPLATE"),
                param("cookieName", "FPID", "TEMPLATE"),
                param("cookieDomain", "auto", "TEMPLATE"),
                param("cookiePath", "/", "TEMPLATE"),
                param("cookieMaxAgeInSec", "63072000", "TEMPLATE"),
            ],
            "fingerprint": "0000000000000",
        }
    ]

    variables = [
        const_variable("1", "Const - Google Ads Conversion ID", ADS_CONVERSION_ID, acc, cid),
        const_variable("2", "Const - Google Ads Label - Purchase", ADS_LABEL_PURCHASE, acc, cid),
        const_variable("3", "Const - Google Ads Label - Add to Cart", ADS_LABEL_ADD_TO_CART, acc, cid),
        const_variable("4", "Const - Google Ads Label - Begin Checkout", ADS_LABEL_BEGIN_CHECKOUT, acc, cid),
        const_variable("5", "Const - Google Ads Label - Submit Lead Form", ADS_LABEL_SUBMIT_LEAD_FORM, acc, cid),
        # Event Data variables (ed) for sGTM tags
        {
            "accountId": acc,
            "containerId": cid,
            "variableId": "10",
            "name": "ED - value",
            "type": "ed",
            "parameter": [
                param("keyPath", "value", "TEMPLATE"),
                param("setDefaultValue", "false", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
        },
        {
            "accountId": acc,
            "containerId": cid,
            "variableId": "11",
            "name": "ED - currency",
            "type": "ed",
            "parameter": [
                param("keyPath", "currency", "TEMPLATE"),
                param("setDefaultValue", "false", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
        },
        {
            "accountId": acc,
            "containerId": cid,
            "variableId": "12",
            "name": "ED - transaction_id",
            "type": "ed",
            "parameter": [
                param("keyPath", "transaction_id", "TEMPLATE"),
                param("setDefaultValue", "false", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
        },
    ]

    ga4_client_filter = [
        {
            "type": "EQUALS",
            "parameter": [
                param("arg0", "{{Client Name}}", "TEMPLATE"),
                param("arg1", "GA4", "TEMPLATE"),
            ],
        }
    ]

    triggers = [
        custom_event_trigger("50", "All GA4 Client Events", ".*", "MATCH_REGEX", acc, cid, ga4_client_filter),
        custom_event_trigger("51", "GA4 Event - purchase", "purchase", "EQUALS", acc, cid, ga4_client_filter),
        custom_event_trigger("52", "GA4 Event - add_to_cart", "add_to_cart", "EQUALS", acc, cid, ga4_client_filter),
        custom_event_trigger("53", "GA4 Event - begin_checkout", "begin_checkout", "EQUALS", acc, cid, ga4_client_filter),
        custom_event_trigger("54", "GA4 Event - newsletter_signup", "newsletter_signup", "EQUALS", acc, cid, ga4_client_filter),
    ]

    tags = [
        # 1. Server-Side Conversion Linker
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "100",
            "name": "Conversion Linker (sGTM)",
            "type": "sgtmadscl",
            "parameter": [param("enableCookieOverrides", "false", "BOOLEAN")],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["50"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 2. GA4 Server Tag - All Events (Forwards G-RVBC6TKCR8 hits to GA4)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "101",
            "name": "GA4 - All Events (sGTM)",
            "type": "sgtmgaaw",
            "parameter": [
                param("redactVisitorIp", "false", "BOOLEAN"),
                param("epToIncludeDropdown", "all", "TEMPLATE"),
                param("upToIncludeDropdown", "all", "TEMPLATE"),
                param("enableEuid", "true", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["50"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 3. Google Ads Conversion - Purchase (sGTM)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "110",
            "name": "Google Ads - Conversion - Purchase (sGTM)",
            "type": "sgtmadsct",
            "parameter": [
                param("conversionId", "{{Const - Google Ads Conversion ID}}", "TEMPLATE"),
                param("conversionLabel", "{{Const - Google Ads Label - Purchase}}", "TEMPLATE"),
                param("conversionValue", "{{ED - value}}", "TEMPLATE"),
                param("currencyCode", "{{ED - currency}}", "TEMPLATE"),
                param("orderId", "{{ED - transaction_id}}", "TEMPLATE"),
                param("enableConversionLinker", "true", "BOOLEAN"),
                param("enableEnhancedMatch", "true", "BOOLEAN"),
                param("enableProductReporting", "true", "BOOLEAN"),
                param("enableNewCustomerReporting", "false", "BOOLEAN"),
                param("rdp", "false", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["51"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 4. Google Ads Conversion - Add to Cart (sGTM - Paused by default to avoid double-counting with Web unless testing sGTM)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "111",
            "name": "Google Ads - Conversion - Add to Cart (sGTM)",
            "type": "sgtmadsct",
            "paused": True,
            "parameter": [
                param("conversionId", "{{Const - Google Ads Conversion ID}}", "TEMPLATE"),
                param("conversionLabel", "{{Const - Google Ads Label - Add to Cart}}", "TEMPLATE"),
                param("conversionValue", "{{ED - value}}", "TEMPLATE"),
                param("currencyCode", "{{ED - currency}}", "TEMPLATE"),
                param("enableConversionLinker", "true", "BOOLEAN"),
                param("enableEnhancedMatch", "false", "BOOLEAN"),
                param("enableProductReporting", "true", "BOOLEAN"),
                param("enableNewCustomerReporting", "false", "BOOLEAN"),
                param("rdp", "false", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["52"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 5. Google Ads Conversion - Begin Checkout (sGTM - Paused by default to avoid double-counting with Web unless testing sGTM)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "112",
            "name": "Google Ads - Conversion - Begin Checkout (sGTM)",
            "type": "sgtmadsct",
            "paused": True,
            "parameter": [
                param("conversionId", "{{Const - Google Ads Conversion ID}}", "TEMPLATE"),
                param("conversionLabel", "{{Const - Google Ads Label - Begin Checkout}}", "TEMPLATE"),
                param("conversionValue", "{{ED - value}}", "TEMPLATE"),
                param("currencyCode", "{{ED - currency}}", "TEMPLATE"),
                param("enableConversionLinker", "true", "BOOLEAN"),
                param("enableEnhancedMatch", "true", "BOOLEAN"),
                param("enableProductReporting", "true", "BOOLEAN"),
                param("enableNewCustomerReporting", "false", "BOOLEAN"),
                param("rdp", "false", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["53"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
        # 6. Google Ads Conversion - Submit Lead Form (sGTM - Paused by default to avoid double-counting with Web unless testing sGTM)
        {
            "accountId": acc,
            "containerId": cid,
            "tagId": "113",
            "name": "Google Ads - Conversion - Submit Lead Form (sGTM)",
            "type": "sgtmadsct",
            "paused": True,
            "parameter": [
                param("conversionId", "{{Const - Google Ads Conversion ID}}", "TEMPLATE"),
                param("conversionLabel", "{{Const - Google Ads Label - Submit Lead Form}}", "TEMPLATE"),
                param("enableConversionLinker", "true", "BOOLEAN"),
                param("enableEnhancedMatch", "true", "BOOLEAN"),
                param("enableProductReporting", "false", "BOOLEAN"),
                param("enableNewCustomerReporting", "false", "BOOLEAN"),
                param("rdp", "false", "BOOLEAN"),
            ],
            "fingerprint": "0000000000000",
            "firingTriggerId": ["54"],
            "tagFiringOption": "ONCE_PER_EVENT",
            "monitoringMetadata": {"type": "MAP"},
            "consentSettings": {"consentStatus": "NOT_SET"},
        },
    ]

    built_in_vars = [
        {"accountId": acc, "containerId": cid, "type": "CONTAINER_VERSION", "name": "Container Version"},
        {"accountId": acc, "containerId": cid, "type": "DEBUG_MODE", "name": "Debug Mode"},
        {"accountId": acc, "containerId": cid, "type": "RANDOM_NUMBER", "name": "Random Number"},
        {"accountId": acc, "containerId": cid, "type": "CONTAINER_ID", "name": "Container ID"},
        {"accountId": acc, "containerId": cid, "type": "EVENT_NAME", "name": "Event Name"},
        {"accountId": acc, "containerId": cid, "type": "VISITOR_REGION", "name": "Visitor Region"},
        {"accountId": acc, "containerId": cid, "type": "REQUEST_PATH", "name": "Request Path"},
        {"accountId": acc, "containerId": cid, "type": "REQUEST_METHOD", "name": "Request Method"},
        {"accountId": acc, "containerId": cid, "type": "CLIENT_NAME", "name": "Client Name"},
        {"accountId": acc, "containerId": cid, "type": "QUERY_STRING", "name": "Query String"},
    ]

    return {
        "exportFormatVersion": 2,
        "exportTime": now_str,
        "containerVersion": {
            "path": f"accounts/{acc}/containers/{cid}/versions/0",
            "accountId": acc,
            "containerId": cid,
            "containerVersionId": "0",
            "container": {
                "path": f"accounts/{acc}/containers/{cid}",
                "accountId": acc,
                "containerId": cid,
                "name": "nielsoverwijn.dev - Server",
                "publicId": SERVER_PUBLIC_ID,
                "usageContext": ["SERVER"],
                "fingerprint": "0000000000000",
                "tagManagerUrl": f"https://tagmanager.google.com/#/container/accounts/{acc}/containers/{cid}/workspaces?apiLink=container",
                "features": {
                    "supportUserPermissions": True,
                    "supportEnvironments": True,
                    "supportWorkspaces": True,
                    "supportGtagConfigs": False,
                    "supportBuiltInVariables": True,
                    "supportClients": True,
                    "supportFolders": True,
                    "supportTags": True,
                    "supportTemplates": True,
                    "supportTriggers": True,
                    "supportVariables": True,
                    "supportVersions": True,
                    "supportZones": True,
                    "supportTransformations": True,
                },
                "tagIds": [SERVER_PUBLIC_ID],
                "taggingServerUrls": [SGTM_SERVER_URL],
            },
            "client": clients,
            "tag": tags,
            "trigger": triggers,
            "variable": variables,
            "builtInVariable": built_in_vars,
            "fingerprint": "0000000000000",
            "tagManagerUrl": f"https://tagmanager.google.com/#/versions/accounts/{acc}/containers/{cid}/versions/0?apiLink=version",
        },
    }


def gtm_request(method: str, path: str, token: str, body: dict = None) -> dict:
    url = f"https://tagmanager.googleapis.com/tagmanager/v2/{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": "nielsoverwijn-sgtm",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} on {method} {url}: {err_body}") from e


def sync_workspace(container_export: dict, workspace_id: str, token: str):
    cv = container_export["containerVersion"]
    acc = cv["accountId"]
    cid = cv["containerId"]
    ws_path = f"accounts/{acc}/containers/{cid}/workspaces/{workspace_id}"
    print(f"\n=== Syncing {cv['container']['name']} ({cv['container']['publicId']}) @ {ws_path} ===")

    # 1. Enable Built-In Variables
    biv_types = [b["type"] for b in cv.get("builtInVariable", [])]
    if biv_types:
        query = "&".join(f"type={t}" for t in biv_types)
        try:
            gtm_request("POST", f"{ws_path}/built_in_variables?{query}", token)
            print(f"  [+] Enabled built-in variables: {', '.join(biv_types)}")
        except Exception as e:
            print(f"  [!] Built-in variables note: {e}")

    # 2. Sync Clients (Server container only)
    if cv.get("client"):
        existing_clients = gtm_request("GET", f"{ws_path}/clients", token).get("client", [])
        by_name = {c["name"]: c for c in existing_clients}
        for client in cv["client"]:
            payload = {"name": client["name"], "type": client["type"], "parameter": client.get("parameter", [])}
            if client["name"] in by_name:
                cid_existing = by_name[client["name"]]["clientId"]
                payload["fingerprint"] = by_name[client["name"]]["fingerprint"]
                gtm_request("PUT", f"{ws_path}/clients/{cid_existing}", token, payload)
                print(f"  [~] Updated Client: {client['name']}")
            else:
                gtm_request("POST", f"{ws_path}/clients", token, payload)
                print(f"  [+] Created Client: {client['name']}")

    # 3. Sync Variables
    existing_vars = gtm_request("GET", f"{ws_path}/variables", token).get("variable", [])
    vars_by_name = {v["name"]: v for v in existing_vars}
    for var in cv.get("variable", []):
        payload = {"name": var["name"], "type": var["type"], "parameter": var.get("parameter", [])}
        if var["name"] in vars_by_name:
            vid_existing = vars_by_name[var["name"]]["variableId"]
            payload["fingerprint"] = vars_by_name[var["name"]]["fingerprint"]
            gtm_request("PUT", f"{ws_path}/variables/{vid_existing}", token, payload)
            print(f"  [~] Updated Variable: {var['name']}")
        else:
            gtm_request("POST", f"{ws_path}/variables", token, payload)
            print(f"  [+] Created Variable: {var['name']}")

    # 4. Sync Triggers (and map template triggerId -> real triggerId)
    existing_triggers = gtm_request("GET", f"{ws_path}/triggers", token).get("trigger", [])
    trigs_by_name = {t["name"]: t for t in existing_triggers}
    trigger_id_map = {
        "2147479553": "2147479553",  # All Pages
        "2147479573": "2147479573",  # Initialization - All Pages
        "2147479574": "2147479574",  # All Pages / Server default
    }
    for trig in cv.get("trigger", []):
        payload = {
            "name": trig["name"],
            "type": trig["type"],
            "customEventFilter": trig.get("customEventFilter", []),
        }
        if "filter" in trig:
            payload["filter"] = trig["filter"]
        if trig["name"] in trigs_by_name:
            tid_existing = trigs_by_name[trig["name"]]["triggerId"]
            payload["fingerprint"] = trigs_by_name[trig["name"]]["fingerprint"]
            res = gtm_request("PUT", f"{ws_path}/triggers/{tid_existing}", token, payload)
            trigger_id_map[trig["triggerId"]] = res["triggerId"]
            print(f"  [~] Updated Trigger: {trig['name']} (ID: {res['triggerId']})")
        else:
            res = gtm_request("POST", f"{ws_path}/triggers", token, payload)
            trigger_id_map[trig["triggerId"]] = res["triggerId"]
            print(f"  [+] Created Trigger: {trig['name']} (ID: {res['triggerId']})")

    # 5. Sync Tags
    existing_tags = gtm_request("GET", f"{ws_path}/tags", token).get("tag", [])
    tags_by_name = {t["name"]: t for t in existing_tags}
    for tag in cv.get("tag", []):
        mapped_triggers = [trigger_id_map[tid] for tid in tag.get("firingTriggerId", [])]
        payload = {
            "name": tag["name"],
            "type": tag["type"],
            "parameter": tag.get("parameter", []),
            "firingTriggerId": mapped_triggers,
            "tagFiringOption": tag.get("tagFiringOption", "ONCE_PER_EVENT"),
            "paused": tag.get("paused", False),
        }
        if tag["name"] in tags_by_name:
            tag_id_existing = tags_by_name[tag["name"]]["tagId"]
            payload["fingerprint"] = tags_by_name[tag["name"]]["fingerprint"]
            gtm_request("PUT", f"{ws_path}/tags/{tag_id_existing}", token, payload)
            print(f"  [~] Updated Tag: {tag['name']}")
        else:
            gtm_request("POST", f"{ws_path}/tags", token, payload)
            print(f"  [+] Created Tag: {tag['name']}")


def main():
    parser = argparse.ArgumentParser(description="Export and/or provision GTM Web & Server containers.")
    parser.add_argument("--export-dir", default="/usr/local/google/home/nielsoverwijn/code/github/gtm-boilerplate/google_tag_manager_web/src")
    parser.add_argument("--apply", action="store_true", help="Provision directly via Tag Manager API v2")
    parser.add_argument("--access-token", default="", help="OAuth2 Bearer token with tagmanager.edit.containers scope")
    args = parser.parse_args()

    web_export = build_web_container_export()
    server_export = build_server_container_export()

    os.makedirs(args.export_dir, exist_ok=True)
    web_path = os.path.join(args.export_dir, "nielsoverwijn-web-GTM-KDFCRJM5.json")
    server_path = os.path.join(args.export_dir, "nielsoverwijn-server-GTM-WBDK738X.json")

    with open(web_path, "w", encoding="utf-8") as f:
        json.dump(web_export, f, indent=2)
    with open(server_path, "w", encoding="utf-8") as f:
        json.dump(server_export, f, indent=2)

    print(f"Exported Web Container JSON    -> {web_path}")
    print(f"Exported Server Container JSON -> {server_path}")

    if args.apply:
        token = args.access_token or os.environ.get("GTM_ACCESS_TOKEN", "")
        if not token:
            print("ERROR: --apply requires --access-token or GTM_ACCESS_TOKEN env var.", file=sys.stderr)
            sys.exit(1)
        sync_workspace(web_export, WEB_WORKSPACE_ID, token)
        sync_workspace(server_export, SERVER_WORKSPACE_ID, token)
        print("\nAll GTM workspaces synced! You can now preview and publish in Tag Manager.")


if __name__ == "__main__":
    main()
