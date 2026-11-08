(function () {
var G = window.G = window.G || {};
var KEY = 'g.profile';
var FIELDS = ['name', 'phone', 'email', 'address', 'photo', 'father', 'mother', 'birth', 'gender', 'blood', 'religion', 'nationality', 'marital', 'occupation', 'nid', 'birthreg', 'passport', 'address_perm'];
var USER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
var OPTIONS = {
gender: [['male', 'পুরুষ', 'Male'], ['female', 'নারী', 'Female'], ['other', 'অন্যান্য', 'Other']],
blood: [['A+', 'A+', 'A+'], ['A-', 'A-', 'A-'], ['B+', 'B+', 'B+'], ['B-', 'B-', 'B-'], ['AB+', 'AB+', 'AB+'], ['AB-', 'AB-', 'AB-'], ['O+', 'O+', 'O+'], ['O-', 'O-', 'O-']],
religion: [['islam', 'ইসলাম', 'Islam'], ['hindu', 'হিন্দু', 'Hinduism'], ['buddhist', 'বৌদ্ধ', 'Buddhism'], ['christian', 'খ্রিস্টান', 'Christianity'], ['other', 'অন্যান্য', 'Other']],
marital: [['single', 'অবিবাহিত', 'Single'], ['married', 'বিবাহিত', 'Married'], ['divorced', 'তালাকপ্রাপ্ত', 'Divorced'], ['widowed', 'বিধবা / বিপত্নীক', 'Widowed']]
};
function read() {
try {
var raw = localStorage.getItem(KEY);
if (!raw) {
return null;
}
var obj = JSON.parse(raw);
return obj && typeof obj === 'object' ? obj : null;
} catch (e) {
return null;
}
}
function notify() {
document.dispatchEvent(new CustomEvent('g:profilechange'));
}
G.profile = {
fields: FIELDS,
options: OPTIONS,
isChoice: function (key) {
return !!OPTIONS[key];
},
label: function (key, value, lang) {
var list = OPTIONS[key];
if (!list || !value) {
return value || '';
}
for (var i = 0; i < list.length; i++) {
if (list[i][0] === value) {
return list[i][lang === 'en' ? 2 : 1];
}
}
return value;
},
get: function () {
var obj = read();
if (!obj) {
return null;
}
var out = {};
var any = false;
for (var i = 0; i < FIELDS.length; i++) {
var key = FIELDS[i];
out[key] = typeof obj[key] === 'string' ? obj[key] : '';
if (out[key]) {
any = true;
}
}
return any ? out : null;
},
save: function (data) {
var out = {};
for (var i = 0; i < FIELDS.length; i++) {
out[FIELDS[i]] = data && typeof data[FIELDS[i]] === 'string' ? data[FIELDS[i]] : '';
}
try {
localStorage.setItem(KEY, JSON.stringify(out));
} catch (e) {
return false;
}
notify();
return true;
},
clear: function () {
try {
localStorage.removeItem(KEY);
} catch (e) {}
notify();
}
};
G.photoToDataUrl = function (file, done) {
if (!file || !/^image\//.test(file.type)) {
done(null);
return;
}
var reader = new FileReader();
reader.onerror = function () {
done(null);
};
reader.onload = function () {
var img = new Image();
img.onerror = function () {
done(null);
};
img.onload = function () {
var max = 600;
var ratio = Math.min(1, max / Math.max(img.width, img.height));
var canvas = document.createElement('canvas');
canvas.width = Math.round(img.width * ratio);
canvas.height = Math.round(img.height * ratio);
var ctx = canvas.getContext('2d');
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
done(canvas.toDataURL('image/jpeg', 0.88));
};
img.src = reader.result;
};
reader.readAsDataURL(file);
};
function setup() {
var tools = document.querySelector('.g-tools');
if (tools) {
var foot = document.getElementById('g-footer');
var base = foot ? (foot.getAttribute('data-base') || '') : '';
var link = document.createElement('a');
link.id = 'g-pf-btn';
link.className = 'g-iconbtn';
link.href = base + 'profile/index.html';
link.setAttribute('data-i18n-label', 'pf.open');
if (document.body.classList.contains('g-profile-page')) {
link.setAttribute('aria-current', 'page');
}
link.innerHTML = USER_SVG;
var nameBox = document.createElement('span');
nameBox.className = 'g-pf-name';
link.appendChild(nameBox);
var showName = function () {
var data = G.profile.get();
var text = data && data.name ? data.name.trim() : '';
nameBox.textContent = text;
nameBox.hidden = !text;
};
showName();
document.addEventListener('g:profilechange', showName);
tools.appendChild(link);
}
G.applyLang();
}
document.addEventListener('DOMContentLoaded', setup);
})();
