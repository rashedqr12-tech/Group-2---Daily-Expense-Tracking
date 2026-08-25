import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  ArrowDownLeft,
  ArrowUpLeft,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Coffee,
  Fuel,
  Home as HomeIcon,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShoppingBasket,
  Sparkles,
  Trash2,
  Utensils,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';

type Expense = {
  id: string;
  amountHalalas: number;
  category: string;
  date: string;
  description: string;
  createdAt: number;
};

const STORAGE_KEY = 'daily-expense-tracking-v1';
const CATEGORIES = [
  'مطاعم ومقاهي',
  'مقاضي المنزل والسوبرماركت',
  'فواتير ومرافق',
  'مواصلات وبنزين',
  'مصاريف شخصية وترفيه',
];

const categoryMeta: Record<string, { icon: LucideIcon; tint: string; label: string }> = {
  'مطاعم ومقاهي': { icon: Utensils, tint: 'category-coral', label: 'مطاعم ومقاهي' },
  'مقاضي المنزل والسوبرماركت': { icon: ShoppingBasket, tint: 'category-gold', label: 'مقاضي المنزل' },
  'فواتير ومرافق': { icon: HomeIcon, tint: 'category-blue', label: 'فواتير ومرافق' },
  'مواصلات وبنزين': { icon: Fuel, tint: 'category-green', label: 'مواصلات وبنزين' },
  'مصاريف شخصية وترفيه': { icon: Sparkles, tint: 'category-plum', label: 'شخصية وترفيه' },
};

const quickAdds = [
  { label: 'غداء كبسة', amountHalalas: 1800, category: 'مطاعم ومقاهي', icon: Utensils },
  { label: 'قهوة اليوم', amountHalalas: 1200, category: 'مطاعم ومقاهي', icon: Coffee },
  { label: 'بنزين', amountHalalas: 5000, category: 'مواصلات وبنزين', icon: Fuel },
];

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function parseHalalas(value: string) {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function formatMoney(halalas: number, withCurrency = true) {
  const amount = new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(halalas) / 100);
  return withCurrency ? `${amount} ر.س` : amount;
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('ar-SA', {
    day: 'numeric',
    month: 'long',
    ...options,
  }).format(new Date(`${date}T12:00:00`));
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { budgetHalalas: 15000, expenses: [] as Expense[] };
    const parsed = JSON.parse(saved);
    return {
      budgetHalalas: typeof parsed.budgetHalalas === 'number' ? parsed.budgetHalalas : 15000,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses as Expense[] : [],
    };
  } catch {
    return { budgetHalalas: 15000, expenses: [] as Expense[] };
  }
}

function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  const Icon = categoryMeta[category]?.icon ?? ReceiptText;
  return <Icon size={size} strokeWidth={1.8} />;
}

function StatCard({ label, value, hint, accent, icon: Icon }: {
  label: string;
  value: string;
  hint: string;
  accent: string;
  icon: LucideIcon;
}) {
  return (
    <article className="card-enter rounded-[1.45rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card)/.82)] p-5 shadow-[0_12px_30px_hsl(35_30%_30%/.05)] backdrop-blur-sm" data-testid={`card-stat-${label}`}>
      <div className="mb-5 flex items-start justify-between">
        <span className={`grid size-10 place-items-center rounded-xl ${accent}`}><Icon size={19} strokeWidth={1.8} /></span>
        <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">{hint}</span>
      </div>
      <p className="text-[13px] font-medium text-[hsl(var(--muted-foreground))]" data-testid={`text-stat-label-${label}`}>{label}</p>
      <p className="amount-display mt-1 text-[25px] font-semibold text-[hsl(var(--foreground))]" dir="ltr" data-testid={`text-stat-value-${label}`}>{value}</p>
    </article>
  );
}

function ExpenseRow({ expense, onDelete }: { expense: Expense; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const meta = categoryMeta[expense.category] ?? categoryMeta['مطاعم ومقاهي'];
  const Icon = meta.icon;
  return (
    <div className="expense-row group flex min-h-[72px] items-center gap-3 rounded-2xl px-2 py-2.5" data-testid={`row-expense-${expense.id}`}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-[14px] ${meta.tint}`} data-testid={`icon-expense-${expense.id}`}><Icon size={19} strokeWidth={1.8} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-[hsl(var(--foreground))]" data-testid={`text-expense-description-${expense.id}`}>{expense.description || meta.label}</p>
        <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]" data-testid={`text-expense-meta-${expense.id}`}>{meta.label} · {formatDate(expense.date, { day: 'numeric', month: 'short' })}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="amount-display text-[15px] font-semibold text-[hsl(var(--foreground))]" dir="ltr" data-testid={`text-expense-amount-${expense.id}`}>{formatMoney(expense.amountHalalas)}</p>
        {confirming ? (
          <div className="flex items-center gap-1 rounded-lg bg-[hsl(var(--destructive)/.1)] p-1">
            <button type="button" className="focus-ring rounded-md px-2 py-1 text-[11px] font-semibold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.12)]" onClick={() => onDelete(expense.id)} data-testid={`button-confirm-delete-${expense.id}`}>حذف</button>
            <button type="button" className="focus-ring rounded-md p-1 text-[hsl(var(--muted-foreground))]" onClick={() => setConfirming(false)} aria-label="إلغاء الحذف" data-testid={`button-cancel-delete-${expense.id}`}><X size={14} /></button>
          </div>
        ) : (
          <button type="button" className="focus-ring grid size-8 place-items-center rounded-lg text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity hover:bg-[hsl(var(--destructive)/.1)] hover:text-[hsl(var(--destructive))] group-hover:opacity-100 max-md:opacity-100" onClick={() => setConfirming(true)} aria-label={`حذف ${expense.description}`} data-testid={`button-delete-expense-${expense.id}`}><Trash2 size={15} /></button>
        )}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[hsl(218_30%_16%/.38)] p-0 backdrop-blur-[3px] sm:items-center sm:p-5" role="dialog" aria-modal="true" data-testid="dialog-overlay">
      <div className={`modal-sheet w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-t-[2rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[0_24px_80px_hsl(218_30%_16%/.2)] sm:rounded-[2rem] sm:p-7`} data-testid="dialog-modal">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-[20px] font-semibold text-[hsl(var(--foreground))]">{title}</h2>
          <button type="button" className="focus-ring grid size-9 place-items-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--border))]" onClick={onClose} aria-label="إغلاق" data-testid="button-close-modal"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddExpenseForm({ onSave, initialDate }: { onSave: (expense: Omit<Expense, 'id' | 'createdAt'>) => void; initialDate: string }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(initialDate);
  const [description, setDescription] = useState('');
  const valid = parseHalalas(amount) > 0;
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onSave({ amountHalalas: parseHalalas(amount), category, date, description: description.trim() });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-add-expense">
      <label className="block">
        <span className="mb-2 block text-[12px] font-semibold text-[hsl(var(--muted-foreground))]">المبلغ</span>
        <div className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.55)] px-4 py-3 transition-colors focus-within:border-[hsl(var(--primary))] focus-within:ring-2 focus-within:ring-[hsl(var(--primary)/.12)]">
          <input autoFocus required inputMode="decimal" type="text" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="amount-display min-w-0 flex-1 bg-transparent text-[24px] font-semibold outline-none placeholder:text-[hsl(var(--muted-foreground)/.45)]" dir="ltr" data-testid="input-expense-amount" />
          <span className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">ر.س</span>
        </div>
      </label>
      <label className="block">
        <span className="mb-2 block text-[12px] font-semibold text-[hsl(var(--muted-foreground))]">التصنيف</span>
        <div className="relative">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="focus-ring w-full appearance-none rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.55)] px-3 py-3 text-[13px] outline-none" data-testid="select-expense-category">
            {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <ChevronDown size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        </div>
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[12px] font-semibold text-[hsl(var(--muted-foreground))]">التاريخ</span>
          <div className="relative">
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="focus-ring w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.55)] px-3 py-3 text-[13px] outline-none" data-testid="input-expense-date" />
            <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          </div>
        </label>
        <label className="block">
          <span className="mb-2 block text-[12px] font-semibold text-[hsl(var(--muted-foreground))]">الوصف <span className="font-normal opacity-70">(اختياري)</span></span>
          <input type="text" placeholder="مثال: غداء العمل" value={description} onChange={(e) => setDescription(e.target.value)} className="focus-ring w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.55)] px-3 py-3 text-[13px] outline-none placeholder:text-[hsl(var(--muted-foreground)/.55)]" data-testid="input-expense-description" />
        </label>
      </div>
      <button type="submit" disabled={!valid} className="soft-button mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3.5 text-[14px] font-semibold text-[hsl(var(--primary-foreground))] shadow-[0_8px_20px_hsl(var(--primary)/.18)] disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-save-expense"><Check size={17} /> حفظ المصروف</button>
    </form>
  );
}

function BudgetForm({ budgetHalalas, onSave }: { budgetHalalas: number; onSave: (amount: number) => void }) {
  const [value, setValue] = useState((budgetHalalas / 100).toFixed(2));
  return (
    <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); const parsed = parseHalalas(value); if (parsed > 0) onSave(parsed); }} data-testid="form-budget">
      <input type="text" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="focus-ring amount-display w-28 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.55)] px-3 py-2 text-center text-sm font-semibold outline-none" dir="ltr" data-testid="input-daily-budget" />
      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">ر.س / يوم</span>
      <button type="submit" className="focus-ring grid size-9 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--accent)/.35)]" aria-label="حفظ الميزانية" data-testid="button-save-budget"><Check size={16} /></button>
    </form>
  );
}

function Home() {
  const today = localDate();
  const [budgetHalalas, setBudgetHalalas] = useState(15000);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [filter, setFilter] = useState('الكل');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const saved = loadState();
    setBudgetHalalas(saved.budgetHalalas);
    setExpenses(saved.expenses);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify({ budgetHalalas, expenses }));
  }, [budgetHalalas, expenses, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const todayExpenses = useMemo(() => expenses.filter((expense) => expense.date === today), [expenses, today]);
  const todaySpend = todayExpenses.reduce((sum, expense) => sum + expense.amountHalalas, 0);
  const monthSpend = expenses.filter((expense) => monthKey(expense.date) === monthKey(today)).reduce((sum, expense) => sum + expense.amountHalalas, 0);
  const remaining = budgetHalalas - todaySpend;
  const percentage = budgetHalalas ? Math.round((todaySpend / budgetHalalas) * 100) : 0;
  const progress = Math.min(percentage, 100);
  const status = percentage >= 100 ? 'exceeded' : percentage >= 85 ? 'warning' : 'safe';
  const statusCopy = status === 'exceeded' ? 'تجاوزت حصتك اليوم' : status === 'warning' ? 'اقتربت من حدك اليومي' : 'أنت ضمن حصتك اليوم';
  const statusColor = status === 'exceeded' ? 'text-[hsl(var(--destructive))]' : status === 'warning' ? 'text-[#9b6710]' : 'text-[hsl(var(--primary))]';
  const shownExpenses = useMemo(() => expenses
    .filter((expense) => filter === 'الكل' || expense.category === filter)
    .filter((expense) => !query || `${expense.description} ${expense.category}`.includes(query))
    .sort((a, b) => b.createdAt - a.createdAt), [expenses, filter, query]);

  const notify = (message: string) => setToast(message);
  const addExpense = (data: Omit<Expense, 'id' | 'createdAt'>) => {
    setExpenses((current) => [{ ...data, id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: Date.now() }, ...current]);
    setShowExpenseModal(false);
    notify('تم حفظ المصروف بنجاح');
  };
  const addQuick = (item: typeof quickAdds[number]) => {
    addExpense({ amountHalalas: item.amountHalalas, category: item.category, date: today, description: item.label });
  };
  const deleteExpense = (id: string) => {
    setExpenses((current) => current.filter((expense) => expense.id !== id));
    notify('تم حذف المصروف');
  };

  return (
    <div className="app-shell">
      <div className="relative z-[1] mx-auto max-w-[1440px] px-4 pb-12 sm:px-7 lg:px-10">
        <header className="flex items-center justify-between py-5 sm:py-7" data-testid="header-main">
          <div className="flex items-center gap-3">
            <div className="grid size-10 rotate-3 place-items-center rounded-[14px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[4px_5px_0_hsl(var(--accent))]"><WalletCards size={21} strokeWidth={1.8} /></div>
            <div>
              <p className="font-serif text-[15px] font-semibold leading-tight text-[hsl(var(--foreground))]">رِواق المصروف</p>
              <p className="mt-0.5 text-[10px] font-medium tracking-wide text-[hsl(var(--muted-foreground))]">رفيقك في يومك</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full bg-[hsl(var(--secondary)/.7)] px-3 py-1.5 text-[11px] font-medium text-[hsl(var(--primary))] sm:inline-flex" data-testid="text-current-date">{formatDate(today, { weekday: 'long' })}</span>
            <button type="button" onClick={() => setShowBudgetEditor(true)} className="focus-ring grid size-10 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.4)] hover:text-[hsl(var(--primary))]" aria-label="الإعدادات" data-testid="button-settings"><Settings2 size={18} /></button>
            <div className="grid size-10 place-items-center rounded-full bg-[hsl(var(--accent)/.32)] text-[13px] font-bold text-[hsl(var(--foreground))]" data-testid="avatar-user">أ</div>
          </div>
        </header>

        <main className="page-enter">
          <section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[hsl(var(--primary))]"><span className="size-1.5 rounded-full bg-[hsl(var(--accent))]" /> صباح الخير، أحمد</p>
              <h1 className="font-serif text-[clamp(28px,4vw,43px)] font-semibold leading-[1.35] tracking-[-.04em] text-[hsl(var(--foreground))]" data-testid="heading-dashboard">خلّ يومك المالي<br className="sm:hidden" /> <span className="text-[hsl(var(--primary))]">أوضح وأسهل.</span></h1>
              <p className="mt-3 max-w-md text-[14px] leading-7 text-[hsl(var(--muted-foreground))]">نظرة هادئة على مصاريفك، لتعرف أين أنت بدون ما تحس أنك تحت الاختبار.</p>
            </div>
            <button type="button" onClick={() => setShowExpenseModal(true)} className="soft-button focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3.5 text-[14px] font-semibold text-[hsl(var(--primary-foreground))] shadow-[0_10px_25px_hsl(var(--primary)/.2)] md:w-auto" data-testid="button-add-expense"><Plus size={18} /> إضافة مصروف</button>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="مصروف اليوم" value={formatMoney(todaySpend)} hint="اليوم" accent="bg-[hsl(var(--accent)/.22)] text-[#9b6710]" icon={ArrowDownLeft} />
            <StatCard label={remaining >= 0 ? 'المتبقي اليوم' : 'المتجاوز اليوم'} value={formatMoney(Math.abs(remaining))} hint={remaining >= 0 ? 'من حصتك' : 'فوق حصتك'} accent={remaining >= 0 ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]'} icon={remaining >= 0 ? ArrowUpLeft : ArrowDownLeft} />
            <StatCard label="مصروف الشهر" value={formatMoney(monthSpend)} hint="هذا الشهر" accent="bg-[#c9d8e8] text-[#3e6387]" icon={BarChart3} />
          </section>

          <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(310px,.85fr)]">
            <div className="space-y-4">
              <article className="card-enter overflow-hidden rounded-[1.45rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card)/.82)] p-5 shadow-[0_12px_30px_hsl(35_30%_30%/.05)] backdrop-blur-sm sm:p-7" data-testid="card-daily-quota">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><LayoutDashboard size={16} /></span>
                      <p className="text-[13px] font-semibold text-[hsl(var(--muted-foreground))]">حصتك اليومية</p>
                    </div>
                    <p className={`text-[13px] font-semibold ${statusColor}`} data-testid="status-quota">{statusCopy}</p>
                  </div>
                  <button type="button" onClick={() => setShowBudgetEditor((open) => !open)} className="focus-ring flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" data-testid="button-edit-budget"><Pencil size={13} /> تعديل الحصة</button>
                </div>
                {showBudgetEditor && <div className="mt-4 rounded-xl bg-[hsl(var(--muted)/.65)] px-3 py-3" data-testid="panel-budget-editor"><BudgetForm budgetHalalas={budgetHalalas} onSave={(value) => { setBudgetHalalas(value); setShowBudgetEditor(false); notify('تم تحديث حصتك اليومية'); }} /></div>}
                <div className="mt-7 flex items-end justify-between gap-4">
                  <div>
                    <p className="amount-display text-[clamp(31px,4vw,44px)] font-semibold leading-none text-[hsl(var(--foreground))]" dir="ltr" data-testid="text-daily-spend">{formatMoney(todaySpend, false)} <span className="font-sans text-[15px] tracking-normal text-[hsl(var(--muted-foreground))]">ر.س</span></p>
                    <p className="mt-2 text-[12px] text-[hsl(var(--muted-foreground))]">من أصل <span dir="ltr" className="font-semibold">{formatMoney(budgetHalalas)}</span></p>
                  </div>
                  <span className={`amount-display text-[22px] font-semibold ${statusColor}`} dir="ltr" data-testid="text-quota-percentage">{percentage}%</span>
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-[hsl(var(--muted))]" aria-label={`استخدمت ${percentage} بالمئة من الحصة`} data-testid="progress-quota">
                  <div className={`bar-fill h-full rounded-full transition-[width] duration-500 ${status === 'exceeded' ? 'bg-[hsl(var(--destructive))]' : status === 'warning' ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary))]'}`} style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                  <span>بداية اليوم</span>
                  <span>{remaining >= 0 ? `باقي ${formatMoney(remaining)}` : `تجاوزت ${formatMoney(Math.abs(remaining))}`}</span>
                </div>
              </article>

              <article className="card-enter rounded-[1.45rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card)/.82)] p-5 shadow-[0_12px_30px_hsl(35_30%_30%/.05)] backdrop-blur-sm sm:p-6" data-testid="card-expense-history">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-[18px] font-semibold">آخر المصاريف</h2>
                    <p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">كل ما سجلته، في مكان واحد.</p>
                  </div>
                  <div className="relative">
                    <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث..." className="focus-ring w-32 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.5)] py-2 pe-9 ps-3 text-[12px] outline-none placeholder:text-[hsl(var(--muted-foreground)/.6)] sm:w-40" data-testid="input-search-expenses" />
                  </div>
                </div>
                <div className="mt-5 flex gap-2 overflow-x-auto pb-1" data-testid="filter-expenses">
                  {['الكل', ...CATEGORIES].map((item) => (
                    <button type="button" key={item} onClick={() => setFilter(item)} className={`focus-ring shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${filter === item ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted)/.75)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'}`} data-testid={`button-filter-${item}`}>{item === 'الكل' ? item : categoryMeta[item].label}</button>
                  ))}
                </div>
                <div className="mt-3 divide-y divide-[hsl(var(--border)/.65)]">
                  {!hydrated ? (
                    <div className="space-y-3 py-4" data-testid="state-loading-expenses"><div className="h-14 animate-pulse rounded-xl bg-[hsl(var(--muted))]" /><div className="h-14 animate-pulse rounded-xl bg-[hsl(var(--muted))]" /></div>
                  ) : shownExpenses.length ? shownExpenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} onDelete={deleteExpense} />) : (
                    <div className="flex flex-col items-center justify-center px-5 py-12 text-center" data-testid="state-empty-expenses">
                      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-[hsl(var(--secondary)/.75)] text-[hsl(var(--primary))]"><ReceiptText size={25} strokeWidth={1.6} /></div>
                      <p className="font-serif text-[15px] font-semibold">ما عندك مصاريف هنا بعد</p>
                      <p className="mt-2 max-w-xs text-[12px] leading-6 text-[hsl(var(--muted-foreground))]">{query || filter !== 'الكل' ? 'جرّب تغيير البحث أو التصنيف.' : 'أضف أول مصروف، وخلك قريب من يومك المالي.'}</p>
                      {!query && filter === 'الكل' && <button type="button" onClick={() => setShowExpenseModal(true)} className="mt-4 text-[12px] font-bold text-[hsl(var(--primary))] underline decoration-[hsl(var(--accent))] decoration-2 underline-offset-4" data-testid="button-empty-add-expense">أضف مصروفك الأول</button>}
                    </div>
                  )}
                </div>
              </article>
            </div>

            <aside className="space-y-4">
              <article className="card-enter rounded-[1.45rem] border border-[hsl(var(--primary)/.18)] bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))] shadow-[0_16px_38px_hsl(var(--primary)/.16)] sm:p-6" data-testid="card-quick-add">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="mb-1 text-[12px] font-medium text-[hsl(var(--primary-foreground)/.7)]">تسجيل سريع</p>
                    <h2 className="font-serif text-[20px] font-semibold">وش صرفت اليوم؟</h2>
                  </div>
                  <span className="grid size-9 place-items-center rounded-xl bg-[hsl(var(--primary-foreground)/.12)]"><Plus size={19} /></span>
                </div>
                <div className="mt-5 grid gap-2.5">
                  {quickAdds.map((item) => {
                    const Icon = item.icon;
                    return <button type="button" key={item.label} onClick={() => addQuick(item)} className="quick-action focus-ring flex items-center gap-3 rounded-xl border border-[hsl(var(--primary-foreground)/.13)] bg-[hsl(var(--primary-foreground)/.08)] px-3 py-3 text-right transition-colors hover:bg-[hsl(var(--primary-foreground)/.15)]" data-testid={`button-quick-add-${item.label}`}><span className="grid size-9 place-items-center rounded-lg bg-[hsl(var(--accent)/.9)] text-[hsl(var(--foreground))]"><Icon size={17} strokeWidth={1.8} /></span><span className="flex-1 text-[13px] font-semibold">{item.label}</span><span dir="ltr" className="amount-display text-[13px] font-semibold opacity-85">{formatMoney(item.amountHalalas)}</span><ArrowUpLeft size={14} className="opacity-60" /></button>;
                  })}
                </div>
                <button type="button" onClick={() => setShowExpenseModal(true)} className="focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[hsl(var(--primary-foreground)/.25)] py-3 text-[12px] font-semibold transition-colors hover:bg-[hsl(var(--primary-foreground)/.1)]" data-testid="button-open-full-expense-form"><MoreHorizontal size={16} /> مصروف مختلف؟ أضفه بالتفصيل</button>
              </article>

              <article className="card-enter rounded-[1.45rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card)/.82)] p-5 shadow-[0_12px_30px_hsl(35_30%_30%/.05)] backdrop-blur-sm sm:p-6" data-testid="card-categories">
                <div className="mb-4 flex items-center justify-between">
                  <div><h2 className="font-serif text-[17px] font-semibold">توزيع مصاريفك</h2><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">منذ بداية الشهر</p></div>
                  <BarChart3 size={18} className="text-[hsl(var(--muted-foreground))]" />
                </div>
                <div className="space-y-4">
                  {CATEGORIES.map((category) => {
                    const total = expenses.filter((expense) => expense.category === category && monthKey(expense.date) === monthKey(today)).reduce((sum, expense) => sum + expense.amountHalalas, 0);
                    const share = monthSpend ? Math.round((total / monthSpend) * 100) : 0;
                    return <div key={category} data-testid={`row-category-${category}`}><div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]"><span className="flex min-w-0 items-center gap-2 font-medium"><span className={`grid size-6 shrink-0 place-items-center rounded-md ${categoryMeta[category].tint}`}><CategoryIcon category={category} size={13} /></span><span className="truncate">{categoryMeta[category].label}</span></span><span className="shrink-0 font-semibold text-[hsl(var(--muted-foreground))]" dir="ltr">{formatMoney(total)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className={`bar-fill h-full rounded-full ${categoryMeta[category].tint.replace('bg-', 'bg-')}`} style={{ width: `${share}%` }} /></div></div>;
                  })}
                </div>
              </article>

              <div className="rounded-[1.45rem] border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.13)] p-5" data-testid="card-tip">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--accent)/.3)] text-[#8d5d12]"><CircleHelp size={18} /></span>
                  <div><p className="text-[13px] font-semibold">ملاحظة اليوم</p><p className="mt-1 text-[12px] leading-6 text-[hsl(var(--foreground)/.7)]">المتابعة مو معناها المنع. مجرد ما تعرف وين تروح فلوسك، يصير القرار بيدك.</p></div>
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>

      {showExpenseModal && <Modal title="إضافة مصروف جديد" onClose={() => setShowExpenseModal(false)}><AddExpenseForm onSave={addExpense} initialDate={today} /></Modal>}
      {toast && <div className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-4 py-3 text-[12px] font-semibold text-[hsl(var(--card))] shadow-[0_12px_30px_hsl(218_30%_16%/.2)]" role="status" data-testid="status-toast"><Check size={15} className="text-[hsl(var(--accent))]" /> {toast}</div>}
    </div>
  );
}

function Router() {
  return (
    <ErrorBoundary resetKey={useLocation()[0]}>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>;
}

export default App;