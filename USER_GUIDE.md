# 📖 دليل استعمال MoniaGauf — Guide d'utilisation

نظام تسيير المخزون والمبيعات — *Système de gestion de stock et ventes*

---

## 🚀 1. التركيب — Installation (مرة وحدة فقط)

### الشروط — Prérequis
1. PC Windows 10 ولا أحدث
2. Node.js LTS من https://nodejs.org/ — ثبّتو بـ"Next, Next, Install"

### خطوات التركيب
1. انسخ مجلد `MoniaGauf` كامل لـ`C:\MoniaGauf\`
2. **Double-click** على `setup.bat`
3. انتظر 3-5 دقائق
4. ✅ Icon **MoniaGauf** يظهر على Desktop

---

## 🎯 2. التشغيل اليومي — Lancement quotidien

**Double-click** على Icon **MoniaGauf** على Desktop.
- terminal أسود يفتح (لا تغلقه إلا في الإيقاف)
- المتصفح يفتح وحده على `http://localhost:4000`

### تسجيل الدخول — Login
| | |
|---|---|
| **Email** | `messoudigauf@moniagauf.com` |
| **Mot de passe** | `hafid2026` |

### الإيقاف — Arrêt
أغلق الـterminal الأسود (X في الزاوية).

---

## 📊 3. الصفحات والوظائف — Pages et fonctions

### 🏠 Tableau de bord
شاشة الترحيب — إحصائيات سريعة، تنبيهات stock faible، نشاط حديث.

### 🌾 Matières premières
المواد الأولية (Pâte / Crème / Emballage):
- Ammonium, Bicarbonate de sodium, Lécithine, Sel, Farine de blé
- Graisse végétale, Sucre, Cacao, Arôme Fraise/Citron/Vanille
- 4 Emballages cartons (Fraise/Citron/Vanille/Chocolat)

**أعمال:** زيد، عدّل، احذف، فلتر بالـcatégorie أو stock faible.

### 📦 Achats (مشتريات المواد الأولية)
كي تشتري مواد من fournisseur:
1. اضغط "**Nouveau bon d'achat**"
2. اختار fournisseur (ولا "+ Nouveau" لتزيد جديد)
3. زيد lignes: Matière + Quantité + Prix
4. اختياري: TVA% + ☑️ "Mettre à jour le prix"
5. اضغط "**Valider et générer PDF**"

✅ **الـstock يزيد تلقائياً**
✅ **PDF "Bon de réception"** ينزل
✅ زرين: **Sans TVA** و **TVA X%** للتحميل

### 🍪 Produits finis
المنتجات المصنوعة — 8 cartons:
- Gaufrette Chocolat 40g (Carton 48u) — 1440 DA
- Gaufrette Chocolat 150g (Carton 24u) — 2400 DA
- نفس الشي للـVanille, Citron, Fraise

**ملاحظة:** الـstock تزيد عند **Production**، تنقص عند **Vente**.

### 🚚 Fournisseurs
كرنه fournisseurs — Nom, Téléphone, Email *(optionnel)*, Adresse.

### 👤 Clients
كرنه عملاء — مع **RC N°, NIF, Siège social** اللي يبانوا في الـPDF.

### 🛒 Ventes
البيع للعملاء:
1. اضغط "**Nouvelle vente**"
2. اختار client (ولا "+ Nouveau client")
3. زيد منتجات + cartons + prix
4. **TVA / Remise / Montant versé** → الـrécap لايف يحسب TTC + Reste à payer
5. اضغط "**Valider et générer PDF**"

✅ **الـstock تاع المنتجات ينقص تلقائياً**
✅ زرين تحميل: **BL** (Bon de Livraison) و **Facture** (مفصّلة)
✅ زر ✏️ **Modifier** — تعدّل البيع بدون حذف، الـstock يحدّث وحده

### 📜 Historique
كل المنتجات المبيوعة (item by item):
- Filtres: تاريخ، produit، client، statut
- Top 5 produits vendus
- Export CSV
- زر تحميل PDF لكل bon

### 🏭 Production
صنع المنتجات:
1. اضغط "**Nouvel ordre**"
2. اختار produit + cartons à produire
3. النظام يعرض **preview** للمواد المطلوبة
4. اضغط "**Créer l'ordre**" → status = **En attente**
5. عند الإنتاج الفعلي، اضغط 🟢 **Complétée**:
   - المواد الأولية تنقص حسب الـrecette
   - المنتج النهائي يزيد في stock
6. ولا 🔴 **Non complétée** (إلغاء بدون تأثير)

### 📖 Recettes (BOM)
الوصفات — ما تستهلك كل carton من المواد الأولية:
- Carton 40g: 714g farine + 238g graisse + 209g sucre + ... + arôme/cacao
- Carton 150g: 1316g farine + 439g graisse + ... + arôme/cacao

---

## 💾 4. Backup الاحتياطي — مهم جداً!

كل البيانات (clients, ventes, achats, productions, stock, factures) في **ملف واحد**:

```
C:\MoniaGauf\backend\prisma\dev.db
```

### 🔁 Backup أسبوعي (موصى به)
1. أوقف التطبيق
2. انسخ الملف على:
   - 📁 USB
   - ☁️ Google Drive / OneDrive
   - 💿 قرص خارجي
3. أعد تشغيل التطبيق

### 🔄 استرجاع backup
1. أوقف التطبيق
2. عوّض `dev.db` بنسختك المحفوظة
3. شعّل التطبيق

---

## 🆘 5. مشاكل شائعة — Problèmes courants

### "Le port 4000 est déjà utilisé"
نسخة أخرى من التطبيق شغّالة. أغلق كل terminals السوداء أو أعد تشغيل PC.

### المتصفح ما يفتحش وحده
افتحو يدوياً واكتب: `http://localhost:4000`

### "Stock insuffisant"
- شوف صفحة **Produits finis** ولا **Matières premières** للـstock الحقيقي
- إذا كافي بصح يقول insuffisant → اعمل **Production** أولاً
- إذا ناقص فعلاً → اعمل **Achat** أولاً

### نسيت Mot de passe
اتصل بالمطوّر — يحتاج script لإعادة تعيينو.

### الـicon ما يخدمش
**Right-click** على Icon → **Propriétés** → تأكد المسار:
- Cible: `C:\MoniaGauf\start.bat`
- Démarrer dans: `C:\MoniaGauf`

---

## 🎨 6. تخصيص — Personnalisation

### معلومات الشركة في الـPDF
عدّل ملف:
```
C:\MoniaGauf\frontend\src\lib\company.js
```

```js
export const COMPANY = {
  name:        'MoniaGauf',
  tagline:     'BISCUITERIE, PÂTISSERIE...',
  addressLine1:'TAKERBOUST AGHBALOU BOUIRA',
  addressLine2:'10007 AGHBALOU',
  phone:       '0795110429',
  rc:          'RC N° : 10/100 1467848A20',
  nif:         'NIF : 197062700468164',
  ai:          'ART N° : 10272270861',
  // ...
};
```

ثم أعد بناء الـfrontend:
```cmd
cd C:\MoniaGauf\frontend
npm run build
```

---

## 📞 الدعم — Support

في حالة أي مشكل، اتصل بالمطوّر مع:
- 📸 لقطة شاشة للخطأ
- 📝 شرح ما كنت تدير
- 📂 إذا أمكن، نسخة من `dev.db`

---

**MoniaGauf** © 2026 — *BISCUITERIE, PÂTISSERIE ET PRODUIT DE RÉGIME*
