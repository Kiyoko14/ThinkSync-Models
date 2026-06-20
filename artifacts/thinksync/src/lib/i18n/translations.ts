export type Language = "uz" | "ru" | "en";

export const translations = {
  en: {
    appName: "ThinkSync Models",
    nav: {
      home: "Home", models: "Models", pricing: "Pricing", docs: "Docs",
      login: "Login", register: "Register", dashboard: "Dashboard",
      profile: "Profile", usage: "Usage", billing: "Billing", keys: "API Keys",
      logout: "Logout", admin: "Admin",
    },
    common: {
      loading: "Loading...", save: "Save", cancel: "Cancel", retry: "Retry",
      viewDetails: "View details", search: "Search", filter: "Filter",
      create: "Create", edit: "Edit", delete: "Delete", confirm: "Confirm",
      back: "Back", next: "Next", page: "Page", of: "of", total: "Total",
      status: "Status", active: "Active", inactive: "Inactive", name: "Name",
      email: "Email", password: "Password", actions: "Actions", noResults: "No results found",
      yes: "Yes", no: "No", close: "Close", submit: "Submit",
      required: "Required", invalid: "Invalid", success: "Success",
      error: "Error", warning: "Warning", info: "Info",
    },
    home: {
      title: "AI API Gateway and Billing Platform",
      subtitle: "Production-ready AI model gateway with usage tracking, billing, and API key management.",
      ctaPrimary: "Explore models", ctaSecondary: "Open dashboard",
    },
    auth: {
      emailLabel: "Email",
      passwordLabel: "Password",
      submitLogin: "Sign in",
      submitRegister: "Create account",
      loginDesc: "Sign in with your email and password.",
      registerDesc: "Create a new account to get started.",
      success: "Authenticated successfully.",
    },
    admin: {
      title: "Admin Panel",
      overview: "Overview", models: "Models", users: "Users",
      transactions: "Transactions", packages: "Packages",
      promocodes: "Promocodes", logs: "Audit Logs",
      analytics: "Analytics", unauthorized: "You do not have admin access.",
      adminOnly: "Admin access required.",
    },
  },
  uz: {
    appName: "ThinkSync Models",
    nav: {
      home: "Bosh sahifa", models: "Modellar", pricing: "Narxlar", docs: "Hujjatlar",
      login: "Kirish", register: "Ro'yxatdan o'tish", dashboard: "Boshqaruv paneli",
      profile: "Profil", usage: "Foydalanish", billing: "To'lovlar", keys: "API kalitlar",
      logout: "Chiqish", admin: "Admin",
    },
    common: {
      loading: "Yuklanmoqda...", save: "Saqlash", cancel: "Bekor qilish", retry: "Qayta urinish",
      viewDetails: "Batafsil", search: "Qidirish", filter: "Filter",
      create: "Yaratish", edit: "Tahrirlash", delete: "O'chirish", confirm: "Tasdiqlash",
      back: "Orqaga", next: "Keyingi", page: "Sahifa", of: "dan", total: "Jami",
      status: "Holat", active: "Faol", inactive: "Faol emas", name: "Nomi",
      email: "Email", password: "Parol", actions: "Amallar", noResults: "Natija topilmadi",
      yes: "Ha", no: "Yo'q", close: "Yopish", submit: "Yuborish",
      required: "Majburiy", invalid: "Noto'g'ri", success: "Muvaffaqiyatli",
      error: "Xato", warning: "Ogohlantirish", info: "Ma'lumot",
    },
    home: {
      title: "AI API Gateway va Billing platformasi",
      subtitle: "AI modellarni boshqarish, foydalanishni kuzatish, to'lovlar va API kalitlar boshqaruvi.",
      ctaPrimary: "Modellarni ko'rish", ctaSecondary: "Dashboard ochish",
    },
    auth: {
      emailLabel: "Email",
      passwordLabel: "Parol",
      submitLogin: "Kirish",
      submitRegister: "Akkaunt yaratish",
      loginDesc: "Email va parol bilan tizimga kiring.",
      registerDesc: "Yangi akkaunt yaratish uchun ro'yxatdan o'ting.",
      success: "Muvaffaqiyatli autentifikatsiya qilindi.",
    },
    admin: {
      title: "Admin Panel",
      overview: "Umumiy ko'rinish", models: "Modellar", users: "Foydalanuvchilar",
      transactions: "Tranzaktsiyalar", packages: "Paketlar",
      promocodes: "Promokodlar", logs: "Audit Jurnali",
      analytics: "Analitika", unauthorized: "Sizda admin huquqi yo'q.",
      adminOnly: "Admin huquqi talab etiladi.",
    },
  },
  ru: {
    appName: "ThinkSync Models",
    nav: {
      home: "Главная", models: "Модели", pricing: "Тарифы", docs: "Документация",
      login: "Вход", register: "Регистрация", dashboard: "Панель",
      profile: "Профиль", usage: "Использование", billing: "Биллинг", keys: "API ключи",
      logout: "Выход", admin: "Админ",
    },
    common: {
      loading: "Загрузка...", save: "Сохранить", cancel: "Отмена", retry: "Повторить",
      viewDetails: "Подробнее", search: "Поиск", filter: "Фильтр",
      create: "Создать", edit: "Редактировать", delete: "Удалить", confirm: "Подтвердить",
      back: "Назад", next: "Далее", page: "Страница", of: "из", total: "Всего",
      status: "Статус", active: "Активен", inactive: "Неактивен", name: "Название",
      email: "Email", password: "Пароль", actions: "Действия", noResults: "Ничего не найдено",
      yes: "Да", no: "Нет", close: "Закрыть", submit: "Отправить",
      required: "Обязательно", invalid: "Неверно", success: "Успешно",
      error: "Ошибка", warning: "Предупреждение", info: "Информация",
    },
    home: {
      title: "AI API Gateway и биллинг-платформа",
      subtitle: "Платформа управления AI моделями с отслеживанием использования, биллингом и управлением API ключами.",
      ctaPrimary: "Посмотреть модели", ctaSecondary: "Открыть панель",
    },
    auth: {
      emailLabel: "Email",
      passwordLabel: "Пароль",
      submitLogin: "Войти",
      submitRegister: "Создать аккаунт",
      loginDesc: "Войдите с помощью email и пароля.",
      registerDesc: "Создайте новый аккаунт для начала работы.",
      success: "Аутентификация выполнена успешно.",
    },
    admin: {
      title: "Админ Панель",
      overview: "Обзор", models: "Модели", users: "Пользователи",
      transactions: "Транзакции", packages: "Пакеты",
      promocodes: "Промокоды", logs: "Журнал Аудита",
      analytics: "Аналитика", unauthorized: "У вас нет прав администратора.",
      adminOnly: "Требуются права администратора.",
    },
  },
} as const;

export const languages: Array<{ code: Language; label: string }> = [
  { code: "en", label: "English" },
  { code: "uz", label: "O'zbek" },
  { code: "ru", label: "Русский" },
];

function getByPath(obj: unknown, path: string): string {
  const parts = path.split(".");
  let current: any = obj;
  for (const p of parts) {
    current = current?.[p];
  }
  if (typeof current === "string") return current;
  return path;
}

export function tFunc(language: Language) {
  return (path: string) => getByPath(translations[language], path);
}
