import type { AppLocale } from "./config";

export type Messages = {
  common: {
    privacy: string;
    terms: string;
    copyright: string;
  };
  header: {
    deliverTo: string;
    addressesCta: string;
    toggleDarkMode: string;
    notifications: string;
  };
  search: {
    placeholder: string;
    filterSoon: string;
    loading: string;
    stores: string;
    products: string;
    suggestions: string;
  };
  bottomNav: {
    home: string;
    orders: string;
    cart: string;
    favorites: string;
    account: string;
  };
  checkout: {
    title: string;
    cart: string;
    address: string;
    delivery: string;
    confirmation: string;
    emptyCart: string;
    emptyCartDesc: string;
    backToStore: string;
    useMyLocation: string;
    gpsHint: string;
    fullName: string;
    fullNamePlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    addressDetail: string;
    addressPlaceholder: string;
    postalCode: string;
    postalCodePlaceholder: string;
    savedAddresses: string;
    selectAddress: string;
    notes: string;
    notesPlaceholder: string;
    deliveryTime: string;
    asap: string;
    asapNote: string;
    in30: string;
    in30Note: string;
    in1h: string;
    in1hNote: string;
    scheduled: string;
    scheduledNote: string;
    payment: string;
    cash: string;
    cashNote: string;
    card: string;
    cardNote: string;
    coupon: string;
    couponPlaceholder: string;
    apply: string;
    couponApplied: string;
    subtotal: string;
    deliveryFee: string;
    discount: string;
    total: string;
    calculating: string;
    previous: string;
    continue: string;
    placeOrder: string;
    sending: string;
    loginRequired: string;
    savedLocally: string;
    customer: string;
    deliveryTimeLabel: string;
    paymentLabel: string;
    cashLabel: string;
    cardLabel: string;
  };
  orderTracking: {
    title: string;
    notFound: string;
    backToOrders: string;
    status: string;
    received: string;
    preparing: string;
    onWay: string;
    delivered: string;
    driver: string;
    address: string;
    products: string;
    note: string;
    rating: string;
    vendorRating: string;
    driverRating: string;
    comment: string;
    saving: string;
    updateRating: string;
    submitRating: string;
    ratingError: string;
    serverError: string;
    reorder: string;
    backHome: string;
    callDriver: string;
    cancelOrder: string;
    cancelReason: string;
    cancelReasonPlaceholder: string;
    confirmCancel: string;
    cancelling: string;
    back: string;
    cancelled: string;
    cancelledReason: string;
  };
  driver: {
    home: string;
    orders: string;
    settlement: string;
    logout: string;
    welcome: string;
    todayTasks: string;
    activeNow: string;
    myRating: string;
    todaySettlement: string;
    collected: string;
    myCommission: string;
    netToStore: string;
    settlementDetails: string;
    activeTasks: string;
    claimedOrders: string;
    viewAll: string;
    noActiveTasks: string;
    noActiveHint: string;
    openMap: string;
    availableOrders: string;
    noAvailableOrders: string;
    noAvailableHint: string;
    loadingOrders: string;
    claimOrder: string;
    claiming: string;
    claimError: string;
    alreadyClaimed: string;
    cash: string;
    card: string;
    details: string;
    dispatched: string;
    onWay: string;
  };
  storefront: {
    myOrders: string;
    allOrders: string;
    noOrders: string;
    startShopping: string;
    searchResults: string;
    searchAbout: string;
    searchAboutQuery: string;
    noResults: string;
    stores: string;
    products: string;
    openNow: string;
    freeDelivery: string;
    rating4: string;
    all: string;
    rating4Plus: string;
    minOrderMax: string;
    vendorCategory: string;
    restaurants: string;
    grocery: string;
    pharmacy: string;
    sweets: string;
    beverages: string;
    applyFilters: string;
  };
  cart: {
    title: string;
    items: string;
    empty: string;
    emptyDesc: string;
    browse: string;
    subtotal: string;
    delivery: string;
    total: string;
    checkout: string;
    delete: string;
    decrease: string;
    increase: string;
    close: string;
  };
};

const ar: Messages = {
  common: { privacy: "الخصوصية", terms: "الشروط", copyright: "© جيتك" },
  header: {
    deliverTo: "التوصيل إلى",
    addressesCta: "عناويني وخيارات التوصيل",
    toggleDarkMode: "تبديل الوضع الليلي",
    notifications: "الإشعارات",
  },
  search: {
    placeholder: "ابحث عن منتجات، متاجر، أو مطاعم...",
    filterSoon: "تصفية البحث (قريباً)",
    loading: "جاري البحث…",
    stores: "متاجر",
    products: "منتجات",
    suggestions: "اقتراحات البحث",
  },
  bottomNav: {
    home: "الرئيسية",
    orders: "طلباتي",
    cart: "السلة",
    favorites: "المفضلة",
    account: "حسابي",
  },
  checkout: {
    title: "إتمام الطلب",
    cart: "السلة",
    address: "العنوان",
    delivery: "التوصيل",
    confirmation: "تأكيد",
    emptyCart: "سلتك فارغة",
    emptyCartDesc: "أضف منتجات لتتمكن من إكمال الطلب",
    backToStore: "العودة للمتجر",
    useMyLocation: "استخدم موقعي الحالي",
    gpsHint: "تحديد تلقائي عبر GPS",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "مثال: ليلى الحسني",
    phone: "رقم الهاتف",
    phonePlaceholder: "+964770XXXXXXX",
    addressDetail: "العنوان التفصيلي",
    addressPlaceholder: "المحافظة - المنطقة - الشارع - علامة مميزة",
    postalCode: "الرمز البريدي (اختياري)",
    postalCodePlaceholder: "مثال: 10011",
    savedAddresses: "أو اختر من عناوينك المحفوظة",
    selectAddress: "اختيار عنوان محفوظ",
    notes: "ملاحظات للسائق (اختياري)",
    notesPlaceholder: "مثال: الباب الأزرق، الطابق الثاني",
    deliveryTime: "وقت التوصيل",
    asap: "بأسرع وقت",
    asapNote: "خلال 30 دقيقة",
    in30: "خلال 30 دقيقة",
    in30Note: "موعد محدد",
    in1h: "خلال ساعة",
    in1hNote: "موعد محدد",
    scheduled: "موعد لاحق",
    scheduledNote: "اختر التاريخ",
    payment: "طريقة الدفع",
    cash: "نقداً عند الاستلام",
    cashNote: "بدون رسوم إضافية",
    card: "بطاقة",
    cardNote: "ماستر / فيزا / كي كارد",
    coupon: "كوبون خصم",
    couponPlaceholder: "ادخل كود الخصم",
    apply: "تطبيق",
    couponApplied: "تم تطبيق الكوبون",
    subtotal: "المجموع الفرعي",
    deliveryFee: "التوصيل",
    discount: "الخصم",
    total: "المجموع الكلي",
    calculating: "جار الحساب...",
    previous: "السابق",
    continue: "متابعة",
    placeOrder: "تأكيد الطلب",
    sending: "جاري الإرسال...",
    loginRequired: "يجب تسجيل الدخول لإتمام الطلب",
    savedLocally: "تم حفظ الطلب محلياً",
    customer: "الزبون",
    deliveryTimeLabel: "وقت التوصيل",
    paymentLabel: "الدفع",
    cashLabel: "نقداً عند الاستلام",
    cardLabel: "بطاقة",
  },
  orderTracking: {
    title: "طلب",
    notFound: "الطلب غير موجود",
    backToOrders: "العودة إلى طلباتي",
    status: "حالة الطلب",
    received: "تم استلام الطلب",
    preparing: "قيد التحضير",
    onWay: "في الطريق",
    delivered: "تم التوصيل",
    driver: "السائق المعيّن",
    address: "عنوان التوصيل",
    products: "المنتجات",
    note: "ملاحظة",
    rating: "تقييم الطلب",
    vendorRating: "تقييم المتجر",
    driverRating: "تقييم السائق",
    comment: "تعليقك (اختياري)",
    saving: "جار الحفظ...",
    updateRating: "تحديث التقييم",
    submitRating: "إرسال التقييم",
    ratingError: "فشل إرسال التقييم",
    serverError: "تعذر الاتصال بالخادم",
    reorder: "أعد الطلب",
    backHome: "العودة للرئيسية",
    callDriver: "اتصال بالسائق",
    cancelOrder: "إلغاء الطلب",
    cancelReason: "سبب الإلغاء",
    cancelReasonPlaceholder: "اذكر سبب الإلغاء...",
    confirmCancel: "تأكيد الإلغاء",
    cancelling: "جارٍ الإلغاء...",
    back: "تراجع",
    cancelled: "تم إلغاء هذا الطلب",
    cancelledReason: "السبب",
  },
  driver: {
    home: "الرئيسية",
    orders: "الطلبات",
    settlement: "التقاص",
    logout: "تسجيل خروج",
    welcome: "مرحباً سائقنا",
    todayTasks: "مهام اليوم",
    activeNow: "نشطة الآن",
    myRating: "تقييمي",
    todaySettlement: "تقاص اليوم",
    collected: "المبالغ المحصلة",
    myCommission: "عمولتي",
    netToStore: "الصافي للمحل",
    settlementDetails: "تفاصيل التقاص الكامل",
    activeTasks: "المهام النشطة",
    claimedOrders: "طلبات قمت بمطالبتها",
    viewAll: "عرض الكل",
    noActiveTasks: "لا توجد مهام نشطة",
    noActiveHint: "اطّلب من قائمة الطلبات المتاحة أدناه",
    openMap: "افتح الخريطة",
    availableOrders: "طلبات متاحة للمطالبة",
    noAvailableOrders: "لا توجد طلبات متاحة حالياً",
    noAvailableHint: "ستظهر الطلبات الجديدة هنا فور بثها",
    loadingOrders: "جارٍ تحميل الطلبات المتاحة...",
    claimOrder: "مطالبة بالطلب",
    claiming: "جاري المطالبة...",
    claimError: "فشلت عملية المطالبة",
    alreadyClaimed: "لقد تم مطالبة هذا الطلب بالفعل",
    cash: "نقدي",
    card: "بطاقة",
    details: "عرض التفاصيل",
    dispatched: "مُرسَل",
    onWay: "في الطريق",
  },
  storefront: {
    myOrders: "طلباتي",
    allOrders: "جميع طلباتك السابقة والحالية",
    noOrders: "لا توجد طلبات بعد",
    startShopping: "ابدأ التسوق الآن",
    searchResults: "نتائج البحث",
    searchAbout: "اكتب كلمة في شريط البحث أعلاه",
    searchAboutQuery: "عن",
    noResults: "لا توجد متاجر أو منتجات مطابقة",
    stores: "متاجر",
    products: "منتجات",
    openNow: "مفتوح الآن",
    freeDelivery: "توصيل مجاني",
    rating4: "تقييم 4+",
    all: "الكل",
    rating4Plus: "4 فأعلى",
    minOrderMax: "حد الطلب الأقصى",
    vendorCategory: "فئة المتجر",
    restaurants: "مطاعم",
    grocery: "بقالة",
    pharmacy: "صيدلية",
    sweets: "حلويات",
    beverages: "مشروبات",
    applyFilters: "تطبيق الفلاتر",
  },
  cart: {
    title: "سلة المشتريات",
    items: "منتج",
    empty: "سلتك فارغة",
    emptyDesc: "أضف منتجات من المتجر للبدء",
    browse: "تصفح المتجر",
    subtotal: "المجموع الفرعي",
    delivery: "التوصيل",
    total: "المجموع الكلي",
    checkout: "متابعة لإتمام الطلب",
    delete: "حذف",
    decrease: "تقليل",
    increase: "زيادة",
    close: "إغلاق",
  },
};

const he: Messages = {
  common: { privacy: "פרטיות", terms: "תנאים", copyright: "© Jetek" },
  header: {
    deliverTo: "משלוח אל",
    addressesCta: "הכתובות שלי ואפשרויות משלוח",
    toggleDarkMode: "החלפת מצב כהה",
    notifications: "התראות",
  },
  search: {
    placeholder: "חפש מוצרים, חנויות או מסעדות...",
    filterSoon: "סינון חיפוש (בקרוב)",
    loading: "מחפש...",
    stores: "חנויות",
    products: "מוצרים",
    suggestions: "הצעות חיפוש",
  },
  bottomNav: {
    home: "בית",
    orders: "ההזמנות שלי",
    cart: "סל",
    favorites: "מועדפים",
    account: "החשבון שלי",
  },
  checkout: {
    title: "השלמת הזמנה",
    cart: "עגלה",
    address: "כתובת",
    delivery: "משלוח",
    confirmation: "אישור",
    emptyCart: "העגלה ריקה",
    emptyCartDesc: "הוסף מוצרים כדי להשלים את ההזמנה",
    backToStore: "חזור לחנות",
    useMyLocation: "השתמש במיקום שלי",
    gpsHint: "זיהוי אוטומטי באמצעות GPS",
    fullName: "שם מלא",
    fullNamePlaceholder: "למשל: ישראל ישראלי",
    phone: "מספר טלפון",
    phonePlaceholder: "+972501234567",
    addressDetail: "כתובת מפורטת",
    addressPlaceholder: "עיר - רחוב - מספר בית",
    postalCode: "מיקוד (אופציונלי)",
    postalCodePlaceholder: "למשל: 1234567",
    savedAddresses: "או בחר מהכתובות השמורות שלך",
    selectAddress: "בחר כתובת שמורה",
    notes: "הערות לנהג (אופציונלי)",
    notesPlaceholder: "למשל: דלת כחולה, קומה שנייה",
    deliveryTime: "זמן משלוח",
    asap: "בהקדם האפשרי",
    asapNote: "תוך 30 דקות",
    in30: "תוך 30 דקות",
    in30Note: "מועד קבוע",
    in1h: "תוך שעה",
    in1hNote: "מועד קבוע",
    scheduled: "מועד מאוחר יותר",
    scheduledNote: "בחר תאריך",
    payment: "אמצעי תשלום",
    cash: "מזומן במסירה",
    cashNote: "ללא עמלות נוספות",
    card: "כרטיס",
    cardNote: "מאסטרקארד / ויזה",
    coupon: "קופון הנחה",
    couponPlaceholder: "הכנס קוד קופון",
    apply: "החל",
    couponApplied: "הקופון הוחל",
    subtotal: "סכום ביניים",
    deliveryFee: "משלוח",
    discount: "הנחה",
    total: "סה\"כ",
    calculating: "מחשב...",
    previous: "הקודם",
    continue: "המשך",
    placeOrder: "אישור הזמנה",
    sending: "שולח...",
    loginRequired: "יש להתחבר כדי להשלים את ההזמנה",
    savedLocally: "ההזמנה נשמרה מקומית",
    customer: "לקוח",
    deliveryTimeLabel: "זמן משלוח",
    paymentLabel: "תשלום",
    cashLabel: "מזומן",
    cardLabel: "כרטיס",
  },
  orderTracking: {
    title: "הזמנה",
    notFound: "ההזמנה לא נמצאה",
    backToOrders: "חזור להזמנות שלי",
    status: "סטטוס הזמנה",
    received: "ההזמנה התקבלה",
    preparing: "בהכנה",
    onWay: "בדרך",
    delivered: "נמסר",
    driver: "הנהג המוקצה",
    address: "כתובת למשלוח",
    products: "מוצרים",
    note: "הערה",
    rating: "דירוג הזמנה",
    vendorRating: "דירוג החנות",
    driverRating: "דירוג הנהג",
    comment: "התגובה שלך (אופציונלי)",
    saving: "שומר...",
    updateRating: "עדכן דירוג",
    submitRating: "שלח דירוג",
    ratingError: "שליחת הדירוג נכשלה",
    serverError: "לא ניתן להתחבר לשרת",
    reorder: "הזמן שוב",
    backHome: "חזור לדף הבית",
    callDriver: "התקשר לנהג",
    cancelOrder: "בטל הזמנה",
    cancelReason: "סיבת ביטול",
    cancelReasonPlaceholder: "ציין את סיבת הביטול...",
    confirmCancel: "אשר ביטול",
    cancelling: "מבטל...",
    back: "חזור",
    cancelled: "הזמנה זו בוטלה",
    cancelledReason: "הסיבה",
  },
  driver: {
    home: "דף הבית",
    orders: "הזמנות",
    settlement: "הסדר",
    logout: "התנתק",
    welcome: "שלום נהג",
    todayTasks: "משימות היום",
    activeNow: "פעיל כעת",
    myRating: "הדירוג שלי",
    todaySettlement: "הסדר היום",
    collected: "סכומים שנגבו",
    myCommission: "העמלה שלי",
    netToStore: "נטו לחנות",
    settlementDetails: "פרטי הסדר מלא",
    activeTasks: "משימות פעילות",
    claimedOrders: "הזמנות שתבעת",
    viewAll: "הצג הכל",
    noActiveTasks: "אין משימות פעילות",
    noActiveHint: "תבע מהזמנות זמינות למטה",
    openMap: "פתח מפה",
    availableOrders: "הזמנות זמינות לתביעה",
    noAvailableOrders: "אין הזמנות זמינות כרגע",
    noAvailableHint: "הזמנות חדשות יופיעו כאן",
    loadingOrders: "טוען הזמנות זמינות...",
    claimOrder: "תבוע הזמנה",
    claiming: "תובע...",
    claimError: "תביעת ההזמנה נכשלה",
    alreadyClaimed: "הזמנה זו כבר נתבעה",
    cash: "מזומן",
    card: "כרטיס",
    details: "הצג פרטים",
    dispatched: "נשלח",
    onWay: "בדרך",
  },
  storefront: {
    myOrders: "ההזמנות שלי",
    allOrders: "כל ההזמנות שלך",
    noOrders: "אין הזמנות עדיין",
    startShopping: "התחל לקנות",
    searchResults: "תוצאות חיפוש",
    searchAbout: "הקלד מילה בשורת החיפוש",
    searchAboutQuery: "על",
    noResults: "אין תוצאות",
    stores: "חנויות",
    products: "מוצרים",
    openNow: "פתוח עכשיו",
    freeDelivery: "משלוח חינם",
    rating4: "דירוג 4+",
    all: "הכל",
    rating4Plus: "4 ומעלה",
    minOrderMax: "מינימום הזמנה מרבי",
    vendorCategory: "קטגוריית חנות",
    restaurants: "מסעדות",
    grocery: "מכולת",
    pharmacy: "בית מרקחת",
    sweets: "ממתקים",
    beverages: "משקאות",
    applyFilters: "החל מסננים",
  },
  cart: {
    title: "עגלת קניות",
    items: "מוצרים",
    empty: "העגלה ריקה",
    emptyDesc: "הוסף מוצרים מהחנות כדי להתחיל",
    browse: "עיון בחנות",
    subtotal: "סכום ביניים",
    delivery: "משלוח",
    total: "סה\"כ",
    checkout: "המשך לתשלום",
    delete: "מחק",
    decrease: "הפחת",
    increase: "הגדל",
    close: "סגור",
  },
};

const en: Messages = {
  common: { privacy: "Privacy", terms: "Terms", copyright: "© Jetek" },
  header: {
    deliverTo: "Deliver to",
    addressesCta: "My addresses and delivery options",
    toggleDarkMode: "Toggle dark mode",
    notifications: "Notifications",
  },
  search: {
    placeholder: "Search products, stores, or restaurants...",
    filterSoon: "Filter search (soon)",
    loading: "Searching...",
    stores: "Stores",
    products: "Products",
    suggestions: "Search suggestions",
  },
  bottomNav: {
    home: "Home",
    orders: "My orders",
    cart: "Cart",
    favorites: "Favorites",
    account: "Account",
  },
  checkout: {
    title: "Checkout",
    cart: "Cart",
    address: "Address",
    delivery: "Delivery",
    confirmation: "Confirmation",
    emptyCart: "Your cart is empty",
    emptyCartDesc: "Add products to complete your order",
    backToStore: "Back to store",
    useMyLocation: "Use my location",
    gpsHint: "Automatic GPS detection",
    fullName: "Full name",
    fullNamePlaceholder: "e.g. John Doe",
    phone: "Phone number",
    phonePlaceholder: "+972501234567",
    addressDetail: "Detailed address",
    addressPlaceholder: "City - Street - Building number",
    postalCode: "Postal code (optional)",
    postalCodePlaceholder: "e.g. 1234567",
    savedAddresses: "Or choose from your saved addresses",
    selectAddress: "Select saved address",
    notes: "Notes for driver (optional)",
    notesPlaceholder: "e.g. Blue door, second floor",
    deliveryTime: "Delivery time",
    asap: "As soon as possible",
    asapNote: "Within 30 minutes",
    in30: "Within 30 minutes",
    in30Note: "Scheduled",
    in1h: "Within 1 hour",
    in1hNote: "Scheduled",
    scheduled: "Later",
    scheduledNote: "Choose date",
    payment: "Payment method",
    cash: "Cash on delivery",
    cashNote: "No additional fees",
    card: "Card",
    cardNote: "Mastercard / Visa",
    coupon: "Coupon",
    couponPlaceholder: "Enter coupon code",
    apply: "Apply",
    couponApplied: "Coupon applied",
    subtotal: "Subtotal",
    deliveryFee: "Delivery",
    discount: "Discount",
    total: "Total",
    calculating: "Calculating...",
    previous: "Previous",
    continue: "Continue",
    placeOrder: "Place order",
    sending: "Sending...",
    loginRequired: "Please log in to complete your order",
    savedLocally: "Order saved locally",
    customer: "Customer",
    deliveryTimeLabel: "Delivery time",
    paymentLabel: "Payment",
    cashLabel: "Cash",
    cardLabel: "Card",
  },
  orderTracking: {
    title: "Order",
    notFound: "Order not found",
    backToOrders: "Back to my orders",
    status: "Order status",
    received: "Order received",
    preparing: "Preparing",
    onWay: "On the way",
    delivered: "Delivered",
    driver: "Assigned driver",
    address: "Delivery address",
    products: "Products",
    note: "Note",
    rating: "Rate this order",
    vendorRating: "Store rating",
    driverRating: "Driver rating",
    comment: "Your comment (optional)",
    saving: "Saving...",
    updateRating: "Update rating",
    submitRating: "Submit rating",
    ratingError: "Failed to submit rating",
    serverError: "Unable to connect to server",
    reorder: "Reorder",
    backHome: "Back to home",
    callDriver: "Call driver",
    cancelOrder: "Cancel order",
    cancelReason: "Reason for cancellation",
    cancelReasonPlaceholder: "State the reason...",
    confirmCancel: "Confirm cancellation",
    cancelling: "Cancelling...",
    back: "Back",
    cancelled: "This order has been cancelled",
    cancelledReason: "Reason",
  },
  driver: {
    home: "Home",
    orders: "Orders",
    settlement: "Settlement",
    logout: "Logout",
    welcome: "Welcome driver",
    todayTasks: "Today's tasks",
    activeNow: "Active now",
    myRating: "My rating",
    todaySettlement: "Today's settlement",
    collected: "Amounts collected",
    myCommission: "My commission",
    netToStore: "Net to store",
    settlementDetails: "Full settlement details",
    activeTasks: "Active tasks",
    claimedOrders: "Orders you claimed",
    viewAll: "View all",
    noActiveTasks: "No active tasks",
    noActiveHint: "Claim from available orders below",
    openMap: "Open map",
    availableOrders: "Available orders to claim",
    noAvailableOrders: "No available orders right now",
    noAvailableHint: "New orders will appear here",
    loadingOrders: "Loading available orders...",
    claimOrder: "Claim order",
    claiming: "Claiming...",
    claimError: "Failed to claim order",
    alreadyClaimed: "This order has already been claimed",
    cash: "Cash",
    card: "Card",
    details: "View details",
    dispatched: "Dispatched",
    onWay: "On the way",
  },
  storefront: {
    myOrders: "My orders",
    allOrders: "All your orders",
    noOrders: "No orders yet",
    startShopping: "Start shopping",
    searchResults: "Search results",
    searchAbout: "Type a word in the search bar",
    searchAboutQuery: "for",
    noResults: "No matching results",
    stores: "Stores",
    products: "Products",
    openNow: "Open now",
    freeDelivery: "Free delivery",
    rating4: "Rating 4+",
    all: "All",
    rating4Plus: "4 and above",
    minOrderMax: "Max min order",
    vendorCategory: "Store category",
    restaurants: "Restaurants",
    grocery: "Grocery",
    pharmacy: "Pharmacy",
    sweets: "Sweets",
    beverages: "Beverages",
    applyFilters: "Apply filters",
  },
  cart: {
    title: "Shopping cart",
    items: "products",
    empty: "Your cart is empty",
    emptyDesc: "Add products from the store to start",
    browse: "Browse store",
    subtotal: "Subtotal",
    delivery: "Delivery",
    total: "Total",
    checkout: "Proceed to checkout",
    delete: "Delete",
    decrease: "Decrease",
    increase: "Increase",
    close: "Close",
  },
};

export const messagesByLocale: Record<AppLocale, Messages> = { ar, he, en };
