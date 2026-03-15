package expo.modules.iap

import android.content.Context
import android.util.Log
import dev.hyo.openiap.AndroidSubscriptionOfferInput
import dev.hyo.openiap.DeepLinkOptions
import dev.hyo.openiap.FetchProductsResultProducts
import dev.hyo.openiap.FetchProductsResultSubscriptions
import dev.hyo.openiap.InitConnectionConfig
import dev.hyo.openiap.OpenIapError
import dev.hyo.openiap.OpenIapModule
import dev.hyo.openiap.ProductQueryType
import dev.hyo.openiap.ProductRequest
import dev.hyo.openiap.Purchase
import dev.hyo.openiap.PurchaseOptions
import dev.hyo.openiap.RequestPurchaseAndroidProps
import dev.hyo.openiap.RequestPurchaseProps
import dev.hyo.openiap.RequestPurchasePropsByPlatforms
import dev.hyo.openiap.RequestPurchaseResultPurchase
import dev.hyo.openiap.RequestPurchaseResultPurchases
import dev.hyo.openiap.RequestSubscriptionAndroidProps
import dev.hyo.openiap.RequestSubscriptionPropsByPlatforms
import dev.hyo.openiap.VerifyPurchaseGoogleOptions
import dev.hyo.openiap.VerifyPurchaseProps
import dev.hyo.openiap.VerifyPurchaseWithProviderProps
import dev.hyo.openiap.store.OpenIapStore
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import dev.hyo.openiap.BillingProgramAndroid as OpenIapBillingProgram
import dev.hyo.openiap.ExternalLinkLaunchModeAndroid as OpenIapExternalLinkLaunchMode
import dev.hyo.openiap.ExternalLinkTypeAndroid as OpenIapExternalLinkType
import dev.hyo.openiap.LaunchExternalLinkParamsAndroid as OpenIapLaunchExternalLinkParams

class ExpoIapModule : Module() {
    companion object {
        const val TAG = "ExpoIapModule"
        private const val EVENT_PURCHASE_UPDATED = "purchase-updated"
        private const val EVENT_PURCHASE_ERROR = "purchase-error"
        private const val EVENT_USER_CHOICE_BILLING = "user-choice-billing-android"
        private const val EVENT_DEVELOPER_PROVIDED_BILLING = "developer-provided-billing-android"
        private const val MAX_BUFFERED_EVENTS = 200
    }

    private val job = Job()
    private val scope = CoroutineScope(Dispatchers.Main + job)
    private val context: Context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    private val currentActivity
        get() = appContext.activityProvider?.currentActivity ?: throw Exceptions.MissingActivity()

    private val openIap: OpenIapModule by lazy { OpenIapModule(context) }

    // Pass openIap directly to OpenIapStore to avoid reflection-based module loading
    private val openIapStore: OpenIapStore by lazy { OpenIapStore(openIap) }
    private var listenersAttached = false
    private val pendingEvents = ConcurrentLinkedQueue<Pair<String, Map<String, Any?>>>()
    private val connectionReady = AtomicBoolean(false)
    private val connectionMutex = Mutex()

    override fun definition() =
        ModuleDefinition {
            Name("ExpoIap")

            Constant("ERROR_CODES") {
                OpenIapError.getAllErrorCodes()
            }

            Events(EVENT_PURCHASE_UPDATED, EVENT_PURCHASE_ERROR, EVENT_USER_CHOICE_BILLING, EVENT_DEVELOPER_PROVIDED_BILLING)

            AsyncFunction("initConnection") { config: Map<String, Any?>?, promise: Promise ->
                ExpoIapLog.payload("initConnection", config)

                scope.launch {
                    connectionMutex.withLock {
                        try {
                            // CRITICAL: Set Activity BEFORE calling initConnection
                            // Horizon SDK needs Activity to initialize OVRPlatform with proper returnComponent
                            // https://github.com/meta-quest/Meta-Spatial-SDK-Samples/issues/82#issuecomment-3452577530
                            runCatching { currentActivity }
                                .onSuccess {
                                    ExpoIapLog.debug("Activity available: ${it.javaClass.name}")
                                    openIap.setActivity(it)
                                }.onFailure {
                                    ExpoIapLog.warning("Activity not available during initConnection - OpenIAP will use Context")
                                }

                            // If already connected, short-circuit
                            if (connectionReady.get()) {
                                ExpoIapLog.result("initConnection", true)
                                promise.resolve(true)
                                return@withLock
                            }

                            // Attach listeners early to avoid races during init
                            if (!listenersAttached) {
                                listenersAttached = true
                                ExpoIapHelper.setupListeners(
                                    openIap,
                                    this@ExpoIapModule,
                                    scope,
                                    connectionReady,
                                    pendingEvents,
                                    EVENT_PURCHASE_UPDATED,
                                    EVENT_PURCHASE_ERROR,
                                    EVENT_USER_CHOICE_BILLING,
                                    EVENT_DEVELOPER_PROVIDED_BILLING,
                                )
                            }

                            // Parse config from Map to InitConnectionConfig
                            val parsedConfig = config?.let { InitConnectionConfig.fromJson(it) }
                            val ok = openIap.initConnection.invoke(parsedConfig)

                            if (!ok) {
                                // Clear any buffered events from a failed init
                                pendingEvents.clear()
                                ExpoIapLog.failure("initConnection", IllegalStateException("Failed to initialize connection"))
                                promise.reject(OpenIapError.InitConnection.CODE, "Failed to initialize connection", null)
                                return@withLock
                            }

                            // Mark ready then flush any buffered events
                            connectionReady.set(true)
                            while (true) {
                                val ev = pendingEvents.poll() ?: break
                                // Already on main dispatcher here; emit directly
                                runCatching { sendEvent(ev.first, ev.second) }
                                    .onFailure { Log.e(TAG, "Failed to flush buffered event: ${ev.first}", it) }
                            }

                            ExpoIapLog.result("initConnection", true)
                            promise.resolve(true)
                        } catch (e: Exception) {
                            ExpoIapLog.failure("initConnection", e)
                            promise.reject(OpenIapError.InitConnection.CODE, e.message, e)
                        }
                    }
                }
            }

            AsyncFunction("endConnection") { promise: Promise ->
                ExpoIapLog.payload("endConnection", null)
                scope.launch {
                    connectionMutex.withLock {
                        runCatching { openIap.endConnection() }
                        ExpoIapHelper.cleanupListeners(openIap)
                        // Reset connection state and clear any buffered events
                        connectionReady.set(false)
                        pendingEvents.clear()
                        listenersAttached = false
                        ExpoIapLog.result("endConnection", true)
                        promise.resolve(true)
                    }
                }
            }

            AsyncFunction("fetchProducts") { type: String, skuArr: Array<String>, promise: Promise ->
                ExpoIapLog.payload(
                    "fetchProductsAndroid",
                    mapOf("type" to type, "skus" to skuArr.toList()),
                )
                scope.launch {
                    try {
                        val queryType = ExpoIapHelper.parseProductQueryType(type)
                        val request = ProductRequest(skuArr.toList(), queryType)
                        val result = openIap.fetchProducts(request)
                        val payload =
                            when (result) {
                                is FetchProductsResultProducts -> result.value.orEmpty().map { it.toJson() }
                                is FetchProductsResultSubscriptions -> result.value.orEmpty().map { it.toJson() }
                                else -> emptyList<Map<String, Any?>>()
                            }
                        ExpoIapLog.result("fetchProductsAndroid", payload)
                        promise.resolve(payload)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("fetchProductsAndroid", e)
                        promise.reject(OpenIapError.QueryProduct.CODE, e.message, null)
                    }
                }
            }

            AsyncFunction("getAvailableItems") { options: Map<String, Any?>?, promise: Promise ->
                ExpoIapLog.payload("getAvailableItemsAndroid", options)
                scope.launch {
                    try {
                        val purchaseOptions = options?.let { PurchaseOptions.fromJson(it) }
                        val purchases = openIap.getAvailablePurchases(purchaseOptions)
                        val payload = purchases.map { it.toJson() }
                        ExpoIapLog.result("getAvailableItemsAndroid", payload)
                        promise.resolve(payload)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("getAvailableItemsAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, null)
                    }
                }
            }

            // Deep link to Manage Subscriptions screen (Android)
            AsyncFunction("deepLinkToSubscriptionsAndroid") { params: Map<String, Any?>, promise: Promise ->
                val sku = (params["sku"] ?: params["skuAndroid"]) as? String
                val packageName = (params["packageName"] ?: params["packageNameAndroid"]) as? String
                ExpoIapLog.payload("deepLinkToSubscriptionsAndroid", mapOf("sku" to sku, "packageName" to packageName))
                scope.launch {
                    try {
                        openIap.deepLinkToSubscriptions(DeepLinkOptions(packageNameAndroid = packageName, skuAndroid = sku))
                        ExpoIapLog.result("deepLinkToSubscriptionsAndroid", true)
                        promise.resolve(null)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("deepLinkToSubscriptionsAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, null)
                    }
                }
            }

            // Get storefront country code (Android implementation)
            AsyncFunction("getStorefront") { promise: Promise ->
                ExpoIapLog.payload("getStorefront", null)
                scope.launch {
                    try {
                        val code = openIap.getStorefront()
                        ExpoIapLog.result("getStorefront", code)
                        promise.resolve(code)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("getStorefront", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, e)
                    }
                }
            }

            AsyncFunction("requestPurchase") { params: Map<String, Any?>, promise: Promise ->
                ExpoIapLog.payload("requestPurchaseAndroid", params)
                val parsedParams = ExpoIapHelper.parseRequestPurchaseParams(params)

                val productType =
                    when (ExpoIapHelper.parseProductQueryType(parsedParams.type)) {
                        ProductQueryType.Subs -> ProductQueryType.Subs
                        else -> ProductQueryType.InApp
                    }

                val fallbackOffers =
                    if (parsedParams.explicitSubscriptionOffers.isEmpty() && parsedParams.offerTokenArr.isNotEmpty()) {
                        parsedParams.skus.zip(parsedParams.offerTokenArr).mapNotNull { (sku, token) ->
                            if (token.isNotEmpty()) {
                                AndroidSubscriptionOfferInput(offerToken = token, sku = sku)
                            } else {
                                null
                            }
                        }
                    } else {
                        emptyList()
                    }

                val subscriptionOffers =
                    (parsedParams.explicitSubscriptionOffers.ifEmpty { fallbackOffers })
                        .takeIf { it.isNotEmpty() }

                val requestProps =
                    when (productType) {
                        ProductQueryType.Subs -> {
                            val android =
                                RequestSubscriptionAndroidProps(
                                    isOfferPersonalized = parsedParams.isOfferPersonalized,
                                    obfuscatedAccountId = parsedParams.obfuscatedAccountId,
                                    obfuscatedProfileId = parsedParams.obfuscatedProfileId,
                                    purchaseToken = parsedParams.purchaseToken,
                                    replacementMode = parsedParams.replacementMode?.toInt(),
                                    skus = parsedParams.skus,
                                    subscriptionOffers = subscriptionOffers,
                                    subscriptionProductReplacementParams = parsedParams.subscriptionProductReplacementParams,
                                )
                            RequestPurchaseProps(
                                request =
                                    RequestPurchaseProps.Request.Subscription(
                                        RequestSubscriptionPropsByPlatforms(android = android),
                                    ),
                                type = ProductQueryType.Subs,
                            )
                        }

                        else -> {
                            val android =
                                RequestPurchaseAndroidProps(
                                    isOfferPersonalized = parsedParams.isOfferPersonalized,
                                    obfuscatedAccountId = parsedParams.obfuscatedAccountId,
                                    obfuscatedProfileId = parsedParams.obfuscatedProfileId,
                                    offerToken = parsedParams.offerToken,
                                    skus = parsedParams.skus,
                                )
                            RequestPurchaseProps(
                                request =
                                    RequestPurchaseProps.Request.Purchase(
                                        RequestPurchasePropsByPlatforms(android = android),
                                    ),
                                type = ProductQueryType.InApp,
                            )
                        }
                    }

                ExpoIapHelper.addPurchasePromise(promise)
                scope.launch {
                    try {
                        val activity = currentActivity
                        openIap.setActivity(activity)
                        val result = openIap.requestPurchase(requestProps)
                        val purchases =
                            when (result) {
                                is RequestPurchaseResultPurchases -> result.value.orEmpty()
                                is RequestPurchaseResultPurchase -> result.value?.let(::listOf).orEmpty()
                                else -> emptyList()
                            }
                        ExpoIapLog.result(
                            "requestPurchaseAndroid",
                            purchases.map { it.toJson() },
                        )
                        ExpoIapHelper.resolvePurchasePromises(purchases.map { it.toJson() })
                    } catch (e: Exception) {
                        ExpoIapLog.failure("requestPurchaseAndroid", e)
                        // Try to use toJSON() if available (OpenIAP PurchaseError), otherwise create a generic error map
                        val errorMap =
                            runCatching {
                                @Suppress("UNCHECKED_CAST")
                                e.javaClass.getMethod("toJSON").invoke(e) as Map<String, Any?>
                            }.getOrElse {
                                mapOf(
                                    "code" to OpenIapError.PurchaseFailed.CODE,
                                    "message" to (e.message ?: "Purchase failed"),
                                    "platform" to "android",
                                )
                            }
                        val errorCode = errorMap["code"] as? String ?: OpenIapError.PurchaseFailed.CODE
                        runCatching {
                            ExpoIapHelper.emitOrQueue(
                                this@ExpoIapModule,
                                scope,
                                connectionReady,
                                pendingEvents,
                                EVENT_PURCHASE_ERROR,
                                errorMap,
                            )
                        }.onFailure { ex ->
                            Log.e(
                                TAG,
                                "Failed to send PURCHASE_ERROR event (requestPurchase)",
                                ex,
                            )
                        }
                        ExpoIapHelper.rejectPurchasePromises(
                            errorCode,
                            e.message,
                            null,
                        )
                    }
                }
            }

            AsyncFunction("acknowledgePurchaseAndroid") { token: String, promise: Promise ->
                ExpoIapLog.payload("acknowledgePurchaseAndroid", mapOf("token" to token))
                scope.launch {
                    try {
                        openIap.acknowledgePurchaseAndroid(token)
                        val response = mapOf("responseCode" to 0)
                        ExpoIapLog.result("acknowledgePurchaseAndroid", response)
                        promise.resolve(response)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("acknowledgePurchaseAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, null)
                    }
                }
            }

            // New name: consumePurchaseAndroid
            AsyncFunction("consumePurchaseAndroid") { token: String, promise: Promise ->
                ExpoIapLog.payload("consumePurchaseAndroid", mapOf("token" to token))
                scope.launch {
                    try {
                        openIap.consumePurchaseAndroid(token)
                        val response = mapOf("responseCode" to 0, "purchaseToken" to token)
                        ExpoIapLog.result("consumePurchaseAndroid", response)
                        promise.resolve(response)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("consumePurchaseAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, null)
                    }
                }
            }

            @Suppress("DEPRECATION")
            AsyncFunction("checkAlternativeBillingAvailabilityAndroid") { promise: Promise ->
                ExpoIapLog.payload("checkAlternativeBillingAvailabilityAndroid", null)
                scope.launch {
                    try {
                        val isAvailable = openIap.checkAlternativeBillingAvailability()
                        ExpoIapLog.result("checkAlternativeBillingAvailabilityAndroid", isAvailable)
                        promise.resolve(isAvailable)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("checkAlternativeBillingAvailabilityAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, null)
                    }
                }
            }

            @Suppress("DEPRECATION")
            AsyncFunction("showAlternativeBillingDialogAndroid") { promise: Promise ->
                ExpoIapLog.payload("showAlternativeBillingDialogAndroid", null)
                scope.launch {
                    try {
                        val activity =
                            runCatching { currentActivity }
                                .onFailure {
                                    Log.e(TAG, "showAlternativeBillingDialogAndroid: Activity missing", it)
                                }.getOrNull() ?: run {
                                promise.reject(OpenIapError.ServiceUnavailable.CODE, "Activity not available", null)
                                return@launch
                            }
                        openIap.setActivity(activity)
                        val userAccepted = openIap.showAlternativeBillingInformationDialog(activity)
                        ExpoIapLog.result("showAlternativeBillingDialogAndroid", userAccepted)
                        promise.resolve(userAccepted)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("showAlternativeBillingDialogAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, null)
                    }
                }
            }

            @Suppress("DEPRECATION")
            AsyncFunction("createAlternativeBillingTokenAndroid") { sku: String?, promise: Promise ->
                ExpoIapLog.payload("createAlternativeBillingTokenAndroid", mapOf("sku" to sku))
                scope.launch {
                    try {
                        // Note: OpenIapModule.createAlternativeBillingReportingToken() doesn't accept sku parameter
                        // The sku parameter is ignored for now - may be used in future versions
                        val token = openIap.createAlternativeBillingReportingToken()
                        ExpoIapLog.result("createAlternativeBillingTokenAndroid", token)
                        promise.resolve(token)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("createAlternativeBillingTokenAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, null)
                    }
                }
            }

            @Suppress("UNCHECKED_CAST")
            AsyncFunction("verifyPurchase") { params: Map<String, Any?>, promise: Promise ->
                ExpoIapLog.payload("verifyPurchase", params)
                scope.launch {
                    try {
                        val googleOptions =
                            (params["google"] as? Map<String, Any?>)?.let { opts ->
                                VerifyPurchaseGoogleOptions(
                                    sku =
                                        (opts["sku"] as? String)?.takeIf { it.isNotEmpty() }
                                            ?: throw IllegalArgumentException("Missing or empty required parameter: google.sku"),
                                    accessToken =
                                        (opts["accessToken"] as? String)?.takeIf { it.isNotEmpty() }
                                            ?: throw IllegalArgumentException("Missing or empty required parameter: google.accessToken"),
                                    packageName =
                                        (opts["packageName"] as? String)?.takeIf { it.isNotEmpty() }
                                            ?: throw IllegalArgumentException("Missing or empty required parameter: google.packageName"),
                                    purchaseToken =
                                        (opts["purchaseToken"] as? String)?.takeIf { it.isNotEmpty() }
                                            ?: throw IllegalArgumentException("Missing or empty required parameter: google.purchaseToken"),
                                    isSub = opts["isSub"] as? Boolean,
                                )
                            }

                        val props =
                            VerifyPurchaseProps(
                                google = googleOptions,
                            )

                        val result = openIap.verifyPurchase(props)
                        val resultMap = result.toJson()
                        ExpoIapLog.result("verifyPurchase", resultMap)
                        promise.resolve(resultMap)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("verifyPurchase", e)
                        promise.reject(OpenIapError.VerificationFailed.CODE, e.message, e)
                    }
                }
            }

            AsyncFunction("verifyPurchaseWithProvider") { params: Map<String, Any?>, promise: Promise ->
                ExpoIapLog.payload("verifyPurchaseWithProvider", params)
                scope.launch {
                    try {
                        val props =
                            VerifyPurchaseWithProviderProps.fromJson(params)
                                ?: throw IllegalArgumentException("Invalid verifyPurchaseWithProvider params")
                        val result = openIap.verifyPurchaseWithProvider(props)
                        val resultMap = result.toJson()
                        ExpoIapLog.result("verifyPurchaseWithProvider", resultMap)
                        promise.resolve(resultMap)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("verifyPurchaseWithProvider", e)
                        promise.reject(OpenIapError.VerificationFailed.CODE, e.message, e)
                    }
                }
            }

            AsyncFunction("getActiveSubscriptions") { subscriptionIds: List<String>?, promise: Promise ->
                ExpoIapLog.payload(
                    "getActiveSubscriptions",
                    subscriptionIds?.let { mapOf("subscriptionIds" to it) } ?: emptyMap<String, Any?>(),
                )
                scope.launch {
                    try {
                        val subscriptions = openIap.getActiveSubscriptions(subscriptionIds)
                        val result = subscriptions.map { it.toJson() }
                        ExpoIapLog.result("getActiveSubscriptions", result)
                        promise.resolve(result)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("getActiveSubscriptions", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, e)
                    }
                }
            }

            AsyncFunction("hasActiveSubscriptions") { subscriptionIds: List<String>?, promise: Promise ->
                ExpoIapLog.payload(
                    "hasActiveSubscriptions",
                    subscriptionIds?.let { mapOf("subscriptionIds" to it) } ?: emptyMap<String, Any?>(),
                )
                scope.launch {
                    try {
                        val hasActive = openIap.hasActiveSubscriptions(subscriptionIds)
                        ExpoIapLog.result("hasActiveSubscriptions", hasActive)
                        promise.resolve(hasActive)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("hasActiveSubscriptions", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, e)
                    }
                }
            }

            // -------------------------------------------------------------------------
            // Billing Programs API (Android 8.2.0+)
            // -------------------------------------------------------------------------

            AsyncFunction("isBillingProgramAvailableAndroid") { program: String, promise: Promise ->
                ExpoIapLog.payload("isBillingProgramAvailableAndroid", mapOf("program" to program))
                scope.launch {
                    try {
                        val openIapProgram = mapBillingProgram(program)
                        // Note: enableBillingProgram should be called before initConnection
                        // for proper BillingClient configuration. Here it's called as a fallback
                        // but may have no effect if BillingClient is already initialized.
                        val result = openIapStore.isBillingProgramAvailable(openIapProgram)
                        val response =
                            mapOf(
                                "billingProgram" to program,
                                "isAvailable" to result.isAvailable,
                            )
                        ExpoIapLog.result("isBillingProgramAvailableAndroid", response)
                        promise.resolve(response)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("isBillingProgramAvailableAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, e)
                    }
                }
            }

            AsyncFunction("createBillingProgramReportingDetailsAndroid") { program: String, promise: Promise ->
                ExpoIapLog.payload("createBillingProgramReportingDetailsAndroid", mapOf("program" to program))
                scope.launch {
                    try {
                        val openIapProgram = mapBillingProgram(program)
                        val result = openIapStore.createBillingProgramReportingDetails(openIapProgram)
                        val response =
                            mapOf(
                                "billingProgram" to program,
                                "externalTransactionToken" to result.externalTransactionToken,
                            )
                        ExpoIapLog.result("createBillingProgramReportingDetailsAndroid", response)
                        promise.resolve(response)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("createBillingProgramReportingDetailsAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, e)
                    }
                }
            }

            AsyncFunction("launchExternalLinkAndroid") { params: Map<String, Any?>, promise: Promise ->
                ExpoIapLog.payload("launchExternalLinkAndroid", params)
                scope.launch {
                    try {
                        val activity =
                            runCatching { currentActivity }
                                .onFailure {
                                    Log.e(TAG, "launchExternalLinkAndroid: Activity missing", it)
                                }.getOrNull() ?: run {
                                promise.reject(OpenIapError.ServiceUnavailable.CODE, "Activity not available", null)
                                return@launch
                            }

                        val billingProgram = params["billingProgram"] as? String
                        val launchMode = params["launchMode"] as? String ?: "unspecified"
                        val linkType = params["linkType"] as? String ?: "unspecified"
                        val linkUri = params["linkUri"] as? String

                        if (billingProgram.isNullOrBlank()) {
                            promise.reject(OpenIapError.DeveloperError.CODE, "`billingProgram` is a required parameter.", null)
                            return@launch
                        }

                        if (linkUri.isNullOrBlank()) {
                            promise.reject(OpenIapError.DeveloperError.CODE, "`linkUri` is a required and non-empty parameter.", null)
                            return@launch
                        }

                        val openIapParams =
                            OpenIapLaunchExternalLinkParams(
                                billingProgram = mapBillingProgram(billingProgram),
                                launchMode = mapExternalLinkLaunchMode(launchMode),
                                linkType = mapExternalLinkType(linkType),
                                linkUri = linkUri,
                            )

                        val result = openIapStore.launchExternalLink(activity, openIapParams)
                        ExpoIapLog.result("launchExternalLinkAndroid", result)
                        promise.resolve(result)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("launchExternalLinkAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, e)
                    }
                }
            }

            OnDestroy {
                ExpoIapHelper.cleanupListeners(openIap)
                job.cancel()
            }
        }

    // -------------------------------------------------------------------------
    // Billing Programs API Helper Functions
    // -------------------------------------------------------------------------

    private fun mapBillingProgram(program: String): OpenIapBillingProgram =
        when (program) {
            "external-offer" -> OpenIapBillingProgram.ExternalOffer
            "external-content-link" -> OpenIapBillingProgram.ExternalContentLink
            "external-payments" -> OpenIapBillingProgram.ExternalPayments
            "user-choice-billing" -> OpenIapBillingProgram.UserChoiceBilling
            else -> OpenIapBillingProgram.Unspecified
        }

    private fun mapExternalLinkLaunchMode(mode: String): OpenIapExternalLinkLaunchMode =
        when (mode) {
            "launch-in-external-browser-or-app" -> OpenIapExternalLinkLaunchMode.LaunchInExternalBrowserOrApp
            "caller-will-launch-link" -> OpenIapExternalLinkLaunchMode.CallerWillLaunchLink
            else -> OpenIapExternalLinkLaunchMode.Unspecified
        }

    private fun mapExternalLinkType(type: String): OpenIapExternalLinkType =
        when (type) {
            "link-to-digital-content-offer" -> OpenIapExternalLinkType.LinkToDigitalContentOffer
            "link-to-app-download" -> OpenIapExternalLinkType.LinkToAppDownload
            else -> OpenIapExternalLinkType.Unspecified
        }
}
