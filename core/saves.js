(function () {
var G = window.G = window.G || {};
var MAX = 10;
var cache = {};
var busy = {};
function key(slug) {
return 'f.' + slug + '.saves';
}
function uid() {
return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
function delKey(slug) {
return 'f.' + slug + '.saves.del';
}
function readDeleted(slug) {
try {
var raw = localStorage.getItem(delKey(slug));
var arr = raw ? JSON.parse(raw) : [];
return Array.isArray(arr) ? arr : [];
} catch (e) {
return [];
}
}
function markDeleted(slug, id) {
var arr = readDeleted(slug);
if (arr.indexOf(id) === -1) {
arr.push(id);
}
try {
localStorage.setItem(delKey(slug), JSON.stringify(arr.slice(-100)));
} catch (e) {}
}
function sigOf(data) {
function part(map) {
var src = map && typeof map === 'object' ? map : {};
return Object.keys(src).sort().map(function (k) {
return [k, src[k]];
});
}
return JSON.stringify([part(data && data.fields), part(data && data.photos)]);
}
function valid(item) {
return item && typeof item.id === 'string' && typeof item.t === 'number' && item.fields && typeof item.fields === 'object';
}
function read(slug) {
if (cache[slug]) {
return cache[slug];
}
var list = [];
try {
var raw = localStorage.getItem(key(slug));
var arr = raw ? JSON.parse(raw) : [];
if (Array.isArray(arr)) {
list = arr.filter(valid);
}
} catch (e) {}
cache[slug] = list;
return list;
}
function write(slug, list) {
var sorted = list.slice().sort(function (a, b) {
return b.t - a.t;
}).slice(0, MAX);
try {
localStorage.setItem(key(slug), JSON.stringify(sorted));
} catch (e) {
return false;
}
cache[slug] = sorted;
return true;
}
function notify(slug) {
document.dispatchEvent(new CustomEvent('g:saveschange', { detail: { slug: slug } }));
}
function mark(slug, id) {
var list = read(slug).slice();
for (var i = 0; i < list.length; i++) {
if (list[i].id === id) {
list[i].sync = 1;
}
}
write(slug, list);
}
function cleanMap(src, pattern) {
var out = {};
if (!src || typeof src !== 'object') {
return out;
}
var keys = Object.keys(src);
for (var i = 0; i < keys.length; i++) {
if (typeof src[keys[i]] === 'string' && (!pattern || pattern.test(src[keys[i]]))) {
out[keys[i]] = src[keys[i]];
}
}
return out;
}
function merge(slug, incoming) {
var list = read(slug).slice();
var known = {};
for (var i = 0; i < list.length; i++) {
known[list[i].id] = true;
}
var gone = readDeleted(slug);
for (var d = 0; d < gone.length; d++) {
known[gone[d]] = true;
}
var added = false;
for (var j = 0; j < incoming.length; j++) {
var s = incoming[j];
if (!s || typeof s.id !== 'string' || !/^[a-z0-9]{6,40}$/.test(s.id) || known[s.id] || typeof s.t !== 'number') {
continue;
}
list.push({
id: s.id,
t: s.t,
name: typeof s.name === 'string' ? s.name.slice(0, 60) : '',
fields: cleanMap(s.fields),
photos: cleanMap(s.photos, /^data:image\/jpeg;base64,/),
sync: 1
});
added = true;
}
if (added && write(slug, list)) {
notify(slug);
}
}
function sync(slug) {
if (busy[slug] || !G.sync || !G.sync.enabled() || navigator.onLine === false) {
return;
}
var session = G.sync.getSession();
if (!session) {
return;
}
busy[slug] = true;
var queue = read(slug).filter(function (item) {
return !item.sync;
});
function finish() {
busy[slug] = false;
}
function pull() {
var have = read(slug).map(function (item) {
return item.id;
}).slice(0, 30);
G.sync.post({ action: 'listSaves', token: session.token, slug: slug, have: have }).then(function (res) {
if (res && res.ok && Array.isArray(res.saves)) {
merge(slug, res.saves);
}
finish();
});
}
function next() {
if (!queue.length) {
pull();
return;
}
var item = queue.shift();
G.sync.post({
action: 'saveForm',
token: session.token,
slug: slug,
id: item.id,
name: item.name,
t: item.t,
fields: item.fields,
photos: item.photos
}).then(function (res) {
if (res && res.ok) {
mark(slug, item.id);
next();
} else {
finish();
}
});
}
next();
}
G.saves = {
list: function (slug) {
return read(slug).slice().sort(function (a, b) {
return b.t - a.t;
});
},
count: function (slug) {
return read(slug).length;
},
add: function (slug, data, name) {
var item = { id: uid(), t: Date.now(), name: String(name || ''), fields: data.fields || {}, photos: data.photos || {}, sync: 0 };
var list = read(slug).slice();
list.unshift(item);
if (!write(slug, list)) {
if (!Object.keys(item.photos).length) {
return null;
}
item.photos = {};
item.noPhoto = true;
if (!write(slug, list)) {
return null;
}
}
notify(slug);
return item;
},
remove: function (slug, id) {
var list = read(slug).filter(function (item) {
return item.id !== id;
});
if (list.length === read(slug).length) {
return false;
}
markDeleted(slug, id);
write(slug, list);
cache[slug] = list;
if (G.sync && G.sync.pushDelete) {
G.sync.pushDelete(slug, id);
}
notify(slug);
return true;
},
sig: sigOf,
has: function (slug, data) {
var target = sigOf(data);
var list = read(slug);
for (var i = 0; i < list.length; i++) {
if (sigOf(list[i]) === target) {
return true;
}
}
return false;
},
sync: sync
};
window.addEventListener('online', function () {
var slug = document.body && document.body.getAttribute('data-form');
if (slug) {
sync(slug);
}
});
})();
