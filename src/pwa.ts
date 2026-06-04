const serviceWorkerPath = "/sw.js";

type ServiceWorkerNavigator = {
  serviceWorker?: {
    register: (scriptURL: string) => Promise<unknown>;
  };
};

type LoadListener = (type: "load", listener: () => void) => void;

export function canUseServiceWorker(navigatorLike: ServiceWorkerNavigator): boolean {
  return Boolean(navigatorLike.serviceWorker);
}

export function registerServiceWorker(
  navigatorLike: ServiceWorkerNavigator = navigator,
  addLoadListener: LoadListener = window.addEventListener.bind(window),
) {
  if (!canUseServiceWorker(navigatorLike)) {
    return;
  }

  addLoadListener("load", () => {
    void navigatorLike.serviceWorker?.register(serviceWorkerPath);
  });
}
