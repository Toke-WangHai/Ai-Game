// Service Worker - 修仙重生模拟器 PWA 离线缓存
const CACHE_NAME = 'xiuxian-v1.3.1';

// 需要缓存的资源列表
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  // 装备图标
  './assets/icons/equip/sword_q1.svg',
  './assets/icons/equip/sword_q2.svg',
  './assets/icons/equip/sword_q3.svg',
  './assets/icons/equip/sword_q4.svg',
  './assets/icons/equip/sword_q5.svg',
  './assets/icons/equip/armor_q1.svg',
  './assets/icons/equip/armor_q2.svg',
  './assets/icons/equip/armor_q3.svg',
  './assets/icons/equip/armor_q4.svg',
  './assets/icons/equip/armor_q5.svg',
  './assets/icons/equip/bracelet_q1.svg',
  './assets/icons/equip/bracelet_q2.svg',
  './assets/icons/equip/bracelet_q3.svg',
  './assets/icons/equip/bracelet_q4.svg',
  './assets/icons/equip/bracelet_q5.svg',
  './assets/icons/equip/leg_q1.svg',
  './assets/icons/equip/leg_q2.svg',
  './assets/icons/equip/leg_q3.svg',
  './assets/icons/equip/leg_q4.svg',
  './assets/icons/equip/leg_q5.svg',
  './assets/icons/equip/boot_q1.svg',
  './assets/icons/equip/boot_q2.svg',
  './assets/icons/equip/boot_q3.svg',
  './assets/icons/equip/boot_q4.svg',
  './assets/icons/equip/boot_q5.svg',
  './assets/icons/equip/treasure_q1.svg',
  './assets/icons/equip/treasure_q2.svg',
  './assets/icons/equip/treasure_q3.svg',
  './assets/icons/equip/treasure_q4.svg',
  './assets/icons/equip/treasure_q5.svg',
  // 物品图标
  './assets/icons/item/stone_1.svg',
  './assets/icons/item/stone_2.svg',
  './assets/icons/item/stone_3.svg',
  './assets/icons/item/stone_4.svg',
  './assets/icons/item/stone_5.svg',
  './assets/icons/item/wood.svg',
  './assets/icons/item/food.svg',
  './assets/icons/item/herb_1.svg',
  './assets/icons/item/herb_2.svg',
  './assets/icons/item/herb_3.svg',
  './assets/icons/item/herb_4.svg',
  './assets/icons/item/herb_5.svg',
  './assets/icons/item/seed_1.svg',
  './assets/icons/item/seed_2.svg',
  './assets/icons/item/seed_3.svg',
  './assets/icons/item/seed_4.svg',
  './assets/icons/item/seed_5.svg',
  // 数据层
  './src/data-processor.js',
  './src/data.js',
  // 核心系统
  './src/equipment.js',
  './src/attribute-calculator.js',
  './src/damage-calculator.js',
  './src/level-calculator.js',
  './src/ui.js',
  './src/battle-system.js',
  './src/dungeon.js',
  './src/item-system.js',
  './src/shop-system.js',
  './src/blessed-land.js',
  './src/dungeon-ui.js',
  './src/save-manager.js',
  './src/game.js',
  './src/equipment-manager.js',
  // UI模块（从index.html拆分）
  './src/game-dialog.js',
  './src/game-settings.js',
  './src/game-clock.js',
  './src/game-resize.js',
  './src/shop-ui.js',
  './src/blessed-land-ui.js',
  './src/backpack-ui.js',
  './src/menu-system.js',
  './src/game-init.js',
  './src/particles.js'
];

// 安装事件 - 缓存所有资源
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] 缓存资源...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          console.log('[SW] 清理旧缓存:', name);
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// 请求拦截 - 缓存优先策略
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      // 缓存中有就直接返回
      if (response) {
        return response;
      }
      // 没有就从网络请求，并缓存结果
      return fetch(event.request).then(function(networkResponse) {
        // 只缓存同源的GET请求
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(function() {
        // 网络请求失败，返回离线页面
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
