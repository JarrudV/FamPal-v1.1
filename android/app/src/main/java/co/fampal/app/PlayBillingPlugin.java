package co.fampal.app;

import android.app.Activity;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesResponseListener;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;

    private void ensureClient(@NonNull PluginCall call, @NonNull Runnable onReady) {
        if (billingClient == null) {
            billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases()
                .build();
        }

        if (billingClient.isReady()) {
            onReady.run();
            return;
        }

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    onReady.run();
                } else {
                    call.reject("billing_setup_failed", String.valueOf(billingResult.getResponseCode()));
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // The SDK reconnects when needed on next API call.
            }
        });
    }

    private JSObject purchaseToJson(Purchase purchase) {
        JSObject out = new JSObject();
        out.put("orderId", purchase.getOrderId());
        out.put("packageName", purchase.getPackageName());
        out.put("purchaseToken", purchase.getPurchaseToken());
        out.put("purchaseTime", purchase.getPurchaseTime());
        out.put("purchaseState", purchase.getPurchaseState());
        out.put("acknowledged", purchase.isAcknowledged());
        out.put("autoRenewing", purchase.isAutoRenewing());

        JSArray products = new JSArray();
        for (String productId : purchase.getProducts()) {
            products.put(productId);
        }
        out.put("products", products);
        return out;
    }

    @PluginMethod
    public void getSubscriptionProducts(PluginCall call) {
        JSArray ids = call.getArray("productIds");
        if (ids == null || ids.length() == 0) {
            call.reject("productIds are required");
            return;
        }

        ensureClient(call, () -> {
            try {
                List<QueryProductDetailsParams.Product> products = new ArrayList<>();
                for (int i = 0; i < ids.length(); i++) {
                    String productId = ids.getString(i);
                    if (productId == null || productId.trim().isEmpty()) continue;
                    products.add(
                        QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(productId)
                            .setProductType(BillingClient.ProductType.SUBS)
                            .build()
                    );
                }

                QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(products)
                    .build();

                billingClient.queryProductDetailsAsync(params, (billingResult, detailsList) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("query_product_details_failed", String.valueOf(billingResult.getResponseCode()));
                        return;
                    }

                    JSArray out = new JSArray();
                    for (ProductDetails details : detailsList) {
                        JSObject item = new JSObject();
                        item.put("productId", details.getProductId());
                        item.put("title", details.getTitle());
                        item.put("description", details.getDescription());

                        JSArray offersJson = new JSArray();
                        String selectedOfferToken = null;
                        if (details.getSubscriptionOfferDetails() != null) {
                            for (ProductDetails.SubscriptionOfferDetails offer : details.getSubscriptionOfferDetails()) {
                                JSObject offerJson = new JSObject();
                                offerJson.put("offerToken", offer.getOfferToken());
                                offerJson.put("basePlanId", offer.getBasePlanId());

                                String formattedPrice = null;
                                String priceCurrencyCode = null;
                                Long priceAmountMicros = null;
                                if (offer.getPricingPhases() != null
                                    && offer.getPricingPhases().getPricingPhaseList() != null
                                    && !offer.getPricingPhases().getPricingPhaseList().isEmpty()) {
                                    ProductDetails.PricingPhase firstPhase = offer.getPricingPhases().getPricingPhaseList().get(0);
                                    formattedPrice = firstPhase.getFormattedPrice();
                                    priceCurrencyCode = firstPhase.getPriceCurrencyCode();
                                    priceAmountMicros = firstPhase.getPriceAmountMicros();
                                }

                                offerJson.put("formattedPrice", formattedPrice);
                                offerJson.put("priceCurrencyCode", priceCurrencyCode);
                                offerJson.put("priceAmountMicros", priceAmountMicros);
                                offersJson.put(offerJson);

                                if (selectedOfferToken == null) {
                                    selectedOfferToken = offer.getOfferToken();
                                }
                            }
                        }

                        item.put("offers", offersJson);
                        item.put("offerToken", selectedOfferToken);
                        out.put(item);
                    }

                    JSObject result = new JSObject();
                    result.put("products", out);
                    call.resolve(result);
                });
            } catch (Exception err) {
                call.reject("query_product_details_exception", err);
            }
        });
    }

    @PluginMethod
    public void purchaseSubscription(PluginCall call) {
        String productId = call.getString("productId");
        String requestedOfferToken = call.getString("offerToken");

        if (productId == null || productId.trim().isEmpty()) {
            call.reject("productId is required");
            return;
        }

        ensureClient(call, () -> {
            QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build();
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(java.util.Collections.singletonList(product))
                .build();

            billingClient.queryProductDetailsAsync(params, (billingResult, detailsList) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || detailsList.isEmpty()) {
                    call.reject("product_not_available", String.valueOf(billingResult.getResponseCode()));
                    return;
                }

                ProductDetails details = detailsList.get(0);
                String offerToken = requestedOfferToken;
                if ((offerToken == null || offerToken.isEmpty())
                    && details.getSubscriptionOfferDetails() != null
                    && !details.getSubscriptionOfferDetails().isEmpty()) {
                    offerToken = details.getSubscriptionOfferDetails().get(0).getOfferToken();
                }

                if (offerToken == null || offerToken.isEmpty()) {
                    call.reject("offer_token_required");
                    return;
                }

                BillingFlowParams.ProductDetailsParams productDetailsParams =
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(details)
                        .setOfferToken(offerToken)
                        .build();

                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(java.util.Collections.singletonList(productDetailsParams))
                    .build();

                Activity activity = getActivity();
                if (activity == null) {
                    call.reject("activity_unavailable");
                    return;
                }

                pendingPurchaseCall = call;
                BillingResult launch = billingClient.launchBillingFlow(activity, flowParams);
                if (launch.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    pendingPurchaseCall = null;
                    call.reject("launch_billing_flow_failed", String.valueOf(launch.getResponseCode()));
                }
            });
        });
    }

    @PluginMethod
    public void queryActivePurchases(PluginCall call) {
        ensureClient(call, () -> billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),
            new PurchasesResponseListener() {
                @Override
                public void onQueryPurchasesResponse(@NonNull BillingResult billingResult, @NonNull List<Purchase> purchases) {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("query_purchases_failed", String.valueOf(billingResult.getResponseCode()));
                        return;
                    }
                    JSArray purchaseItems = new JSArray();
                    for (Purchase purchase : purchases) {
                        purchaseItems.put(purchaseToJson(purchase));
                    }
                    JSObject result = new JSObject();
                    result.put("purchases", purchaseItems);
                    call.resolve(result);
                }
            }
        ));
    }

    @PluginMethod
    public void acknowledgePurchase(PluginCall call) {
        String purchaseToken = call.getString("purchaseToken");
        if (purchaseToken == null || purchaseToken.trim().isEmpty()) {
            call.reject("purchaseToken is required");
            return;
        }

        ensureClient(call, () -> {
            AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchaseToken)
                .build();
            billingClient.acknowledgePurchase(params, billingResult -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("acknowledge_failed", String.valueOf(billingResult.getResponseCode()));
                    return;
                }
                JSObject result = new JSObject();
                result.put("acknowledged", true);
                call.resolve(result);
            });
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        JSObject payload = new JSObject();
        payload.put("responseCode", billingResult.getResponseCode());
        payload.put("debugMessage", billingResult.getDebugMessage());

        JSArray purchaseItems = new JSArray();
        if (purchases != null) {
            for (Purchase purchase : purchases) {
                purchaseItems.put(purchaseToJson(purchase));
            }
        }
        payload.put("purchases", purchaseItems);
        notifyListeners("purchaseUpdated", payload);

        if (pendingPurchaseCall == null) return;

        PluginCall call = pendingPurchaseCall;
        pendingPurchaseCall = null;

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
            call.resolve(payload);
            return;
        }
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            call.reject("purchase_canceled");
            return;
        }
        call.reject("purchase_failed", String.valueOf(billingResult.getResponseCode()));
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null) {
            billingClient.endConnection();
            billingClient = null;
        }
        super.handleOnDestroy();
    }
}
