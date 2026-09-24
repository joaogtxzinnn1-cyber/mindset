const CACHE_NAME = "mindset-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./service-worker.js"
];

/* INSTALAÇÃO */

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

/* ATIVAÇÃO */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

/* REQUISIÇÕES */

self.addEventListener("fetch", event => {

  if(event.request.method !== "GET"){
    return;
  }

  const url = new URL(event.request.url);

  /*
    Arquivos externos, como Google Maps e WhatsApp,
    não são interceptados pelo cache.
  */
  if(url.origin !== self.location.origin){
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {

        if(cachedResponse){
          return cachedResponse;
        }

        return fetch(event.request)
          .then(networkResponse => {

            if(
              !networkResponse ||
              networkResponse.status !== 200 ||
              networkResponse.type !== "basic"
            ){
              return networkResponse;
            }

            const copy = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, copy);
              });

            return networkResponse;
          })
          .catch(() => {

            /*
              Se o usuário estiver offline e tentar
              acessar uma rota desconhecida, volta
              para o aplicativo principal.
            */
            if(event.request.mode === "navigate"){
              return caches.match("./index.html");
            }

          });

      })
  );
});