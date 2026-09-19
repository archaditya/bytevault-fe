declare global {
  interface Window {
    Razorpay: any;
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name?: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

export async function openRazorpaySubscriptionCheckout(options: RazorpayCheckoutOptions) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    if (typeof document !== "undefined") {
      document.body.style.pointerEvents = "auto";
    }
    throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
  }

  // Ensure body pointer events are clean before opening Razorpay
  if (typeof document !== "undefined") {
    document.body.style.pointerEvents = "auto";
  }

  const rzp = new window.Razorpay({
    key: options.key,
    subscription_id: options.subscription_id,
    name: options.name || "PushPostVault",
    description: options.description || "Cloud Storage Subscription",
    image: options.image || "/PushPostVault-icon.png",
    prefill: options.prefill,
    theme: options.theme || {
      color: "#6366f1",
    },
    handler: async (response: any) => {
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = "auto";
      }
      try {
        await options.handler(response);
      } catch (e) {
        console.error("Verification handler failed:", e);
      }
    },
    modal: {
      ondismiss: () => {
        if (typeof document !== "undefined") {
          document.body.style.pointerEvents = "auto";
        }
        if (options.modal?.ondismiss) {
          options.modal.ondismiss();
        }
      },
      ...options.modal,
    },
  });

  rzp.on("payment.failed", (response: any) => {
    if (typeof document !== "undefined") {
      document.body.style.pointerEvents = "auto";
    }
    console.error("Razorpay payment failed:", response.error);
  });

  rzp.open();
}
