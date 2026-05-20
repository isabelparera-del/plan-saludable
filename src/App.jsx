import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Activity, Apple, Scale, Home, Flame, Droplets,
  Trash2, ChefHat, Send, Loader2, PlusCircle, Calendar, LogOut, LogIn
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

// ============================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyAl3mGuJwEng-n-LSeHDIqI8BGDoz76OcM",
  authDomain: "kanban-2bd67.firebaseapp.com",
  projectId: "kanban-2bd67",
  storageBucket: "kanban-2bd67.firebasestorage.app",
  messagingSenderId: "1027301817053",
  appId: "1:1027301817053:web:68f223b02d70e5fd603934"
};

const appId = 'mi-plan-saludable';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ============================================================
// COMPONENTES REUTILIZABLES (fuera de App para no perder foco)
// ============================================================
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) => {
  const baseStyle = "px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm";
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-100",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    danger: "bg-red-50 hover:bg-red-100 text-red-600"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// ============================================================
// PANTALLA DE LOGIN
// ============================================================
const LoginScreen = ({ onLogin, error }) => (
  <div className="min-h-screen bg-red-500 flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-md w-full">
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-200">
          <Activity className="w-8 h-8" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">Mi Plan Saludable</h1>
      <p className="text-sm text-slate-500 text-center mb-8">
        Inicia sesión con tu cuenta de Google para sincronizar tus datos entre todos tus dispositivos.
      </p>
      <button
        onClick={onLogin}
        className="w-full flex items-center justify-center gap-3 py-3 bg-white border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-xl font-medium text-slate-700 transition-all shadow-sm"
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
          <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
        </svg>
        Continuar con Google
      </button>
      {error && (
        <p className="mt-4 text-xs text-rose-600 text-center bg-rose-50 p-3 rounded-xl">{error}</p>
      )}
      <p className="mt-6 text-[10px] text-slate-400 text-center">
        Tus datos se almacenan de forma privada en tu cuenta. Solo tú puedes acceder a ellos.
      </p>
    </div>
  </div>
);

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Metas del usuario
  const [goals, setGoals] = useState({ calories: 2000, weight: 75, water: 8 });
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [tempGoals, setTempGoals] = useState({ calories: 2000, weight: 75, water: 8 });

  // Registros
  const [weightLogs, setWeightLogs] = useState([]);
  const [dietLogs, setDietLogs] = useState([]);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [waterGlasses, setWaterGlasses] = useState(0);

  // CookGem
  const [cookGemMessages, setCookGemMessages] = useState([
    { role: 'model', text: '¡Hola! Soy CookGem 👨‍🍳, tu asistente experto en la **Dieta de los Dados** y tu plan de pérdida de peso. Dime, ¿qué ingredientes tienes en la nevera o qué tipo de comida te apetece hoy?' }
  ]);
  const [cookGemInput, setCookGemInput] = useState('');
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const messagesEndRef = useRef(null);

  // Formularios
  const [newFood, setNewFood] = useState({ type: 'Desayuno', name: '', calories: '', protein: '' });
  const [newExercise, setNewExercise] = useState({ type: 'Cardio', name: '', duration: '', caloriesBurned: '' });
  const [newWeight, setNewWeight] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [newDate, setNewDate] = useState(todayStr);

  // PWA
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // -----------------------------------------------------------
  // Autenticación
  // -----------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error en login:", error);
      setLoginError("No se pudo iniciar sesión. Comprueba que el dominio esté autorizado en Firebase.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // -----------------------------------------------------------
  // Listeners de Firestore (solo si hay usuario)
  // -----------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const unsubGoals = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'goals'), (docSnap) => {
      if (docSnap.exists()) {
        const savedGoals = docSnap.data();
        setGoals(savedGoals);
        setTempGoals(savedGoals);
      }
    }, console.error);

    const unsubDiet = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'dietLogs'), (snapshot) => {
      const logs = snapshot.docs.map(d => d.data());
      setDietLogs(logs.sort((a, b) => a.id - b.id));
    }, console.error);

    const unsubExercise = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'exerciseLogs'), (snapshot) => {
      const logs = snapshot.docs.map(d => d.data());
      setExerciseLogs(logs.sort((a, b) => a.id - b.id));
    }, console.error);

    const unsubWeight = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'weightLogs'), (snapshot) => {
      const logs = snapshot.docs.map(d => d.data());
      setWeightLogs(logs.sort((a, b) => new Date(a.date) - new Date(b.date)));
    }, console.error);

    const unsubWater = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'waterLogs', todayStr), (docSnap) => {
      setWaterGlasses(docSnap.exists() ? (docSnap.data().amount || 0) : 0);
    }, console.error);

    return () => {
      unsubGoals();
      unsubDiet();
      unsubExercise();
      unsubWeight();
      unsubWater();
    };
  }, [user, todayStr]);

  // -----------------------------------------------------------
  // PWA: detección de instalación
  // -----------------------------------------------------------
  useEffect(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(!!isStandaloneMode);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (activeTab === 'cookgem' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [cookGemMessages, activeTab]);

  // -----------------------------------------------------------
  // Cálculos derivados
  // -----------------------------------------------------------
  const todayDietLogs = dietLogs.filter(log => log.date === todayStr);
  const todayExerciseLogs = exerciseLogs.filter(log => log.date === todayStr);

  // Para las tablas, filtramos por la fecha seleccionada en el header
  const filteredDietLogs = dietLogs.filter(log => log.date === newDate);
  const filteredExerciseLogs = exerciseLogs.filter(log => log.date === newDate);

  const totalCaloriesIn = todayDietLogs.reduce((sum, log) => sum + Number(log.calories), 0);
  const totalCaloriesOut = todayExerciseLogs.reduce((sum, log) => sum + Number(log.caloriesBurned), 0);
  const netCalories = totalCaloriesIn - totalCaloriesOut;
  const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null;
  const startWeight = weightLogs.length > 0 ? weightLogs[0].weight : null;

  // -----------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------
  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleSaveGoals = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'goals');
      await setDoc(docRef, {
        calories: Number(tempGoals.calories),
        weight: Number(tempGoals.weight),
        water: Number(tempGoals.water)
      });
      setIsEditingGoals(false);
    } catch (error) {
      console.error("Error al guardar las metas:", error);
    }
  };

  const handleAddFood = async (e) => {
    e.preventDefault();
    if (!user || !newFood.name || !newFood.calories) return;
    try {
      const id = Date.now().toString();
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'dietLogs', id);
      await setDoc(docRef, {
        id,
        date: newDate,
        type: newFood.type,
        name: newFood.name,
        calories: Number(newFood.calories),
        protein: Number(newFood.protein) || 0
      });
      setNewFood({ type: 'Desayuno', name: '', calories: '', protein: '' });
    } catch (error) {
      console.error("Error al añadir alimento:", error);
    }
  };

  const handleDeleteFood = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'dietLogs', id));
    } catch (error) {
      console.error("Error al eliminar alimento:", error);
    }
  };

  const handleAddExercise = async (e) => {
    e.preventDefault();
    if (!user || !newExercise.name || !newExercise.caloriesBurned) return;
    try {
      const id = Date.now().toString();
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'exerciseLogs', id);
      await setDoc(docRef, {
        id,
        date: newDate,
        type: newExercise.type,
        name: newExercise.name,
        duration: Number(newExercise.duration) || 0,
        caloriesBurned: Number(newExercise.caloriesBurned)
      });
      setNewExercise({ type: 'Cardio', name: '', duration: '', caloriesBurned: '' });
    } catch (error) {
      console.error("Error al añadir ejercicio:", error);
    }
  };

  const handleDeleteExercise = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'exerciseLogs', id));
    } catch (error) {
      console.error("Error al eliminar ejercicio:", error);
    }
  };

  const handleAddWeight = async (e) => {
    e.preventDefault();
    if (!user || !newWeight) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'weightLogs', newDate);
      await setDoc(docRef, { date: newDate, weight: Number(newWeight) });
      setNewWeight('');
    } catch (error) {
      console.error("Error al añadir peso:", error);
    }
  };

  const handleDeleteWeight = async (date) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'weightLogs', date));
    } catch (error) {
      console.error("Error al eliminar peso:", error);
    }
  };

  const handleUpdateWater = async (amount) => {
    if (!user) return;
    try {
      const newAmount = Math.max(0, waterGlasses + amount);
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'waterLogs', todayStr);
      await setDoc(docRef, { amount: newAmount });
    } catch (error) {
      console.error("Error al actualizar agua:", error);
    }
  };

  const handleSendCookGem = async (e) => {
    e.preventDefault();
    if (!cookGemInput.trim() || isLoadingRecipe) return;

    const newUserMessage = { role: 'user', text: cookGemInput };
    const updatedMessages = [...cookGemMessages, newUserMessage];

    setCookGemMessages(updatedMessages);
    setCookGemInput('');
    setIsLoadingRecipe(true);

    try {
      // ⚠️ Necesitas una API key de Google AI Studio: https://aistudio.google.com/apikey
      // Para producción, mover esta llamada a un backend para no exponer la key.
      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const systemInstruction = `Eres CookGem, un chef experto en la 'Dieta de los Dados' y en planes de pérdida de peso saludable.
La Dieta de los Dados consiste en combinar una fuente de Proteína, Carbohidrato Complejo, Vegetales y Grasas Saludables para armar platos equilibrados y sanos.
Tu objetivo es ayudar al usuario sugiriendo recetas deliciosas, fáciles de preparar y que encajen en un déficit calórico.
Sé motivador, amigable y proporciona siempre una estimación de calorías y macronutrientes por porción.
Usa formato Markdown claro (negritas, listas) y emojis.`;

      const payload = {
        contents: updatedMessages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        systemInstruction: { parts: [{ text: systemInstruction }] }
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.candidates && result.candidates[0].content) {
        const replyText = result.candidates[0].content.parts[0].text;
        setCookGemMessages(prev => [...prev, { role: 'model', text: replyText }]);
      } else {
        throw new Error("Respuesta de API inválida");
      }
    } catch (error) {
      console.error("Error con CookGem:", error);
      setCookGemMessages(prev => [...prev, {
        role: 'model',
        text: '¡Ups! Parece que se me ha quemado algo en la cocina. Comprueba que tengas configurada la API key de Gemini.'
      }]);
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  // -----------------------------------------------------------
  // Render: pantalla de carga / login
  // -----------------------------------------------------------
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleGoogleLogin} error={loginError} />;
  }

  // -----------------------------------------------------------
  // Render: vistas
  // -----------------------------------------------------------
  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      {!isStandalone && (
        <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-emerald-500 rounded-2xl p-4 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <span className="text-2xl">📱</span>
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base">¡Instala esta App en tu móvil!</h4>
              <p className="text-xs text-white/95">Accede al instante desde tu pantalla de inicio.</p>
            </div>
          </div>
          <button
            onClick={handleInstallApp}
            className="w-full sm:w-auto px-4 py-2 bg-white text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl text-xs transition shadow-sm shrink-0"
          >
            {deferredPrompt ? "Instalar ahora" : "¿Cómo instalar?"}
          </button>
        </div>
      )}

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Resumen de Hoy</h2>
          <p className="text-sm text-slate-500">Lleva el registro diario de tus hábitos saludables.</p>
        </div>
        <Button
          onClick={() => {
            setTempGoals(goals);
            setIsEditingGoals(!isEditingGoals);
          }}
          variant="secondary"
          className="self-start sm:self-center"
        >
          <Scale className="w-4 h-4 text-emerald-500" />
          {isEditingGoals ? "Cancelar Cambios" : "Ajustar mis Metas"}
        </Button>
      </header>

      {isEditingGoals && (
        <Card className="border-2 border-emerald-400 bg-emerald-50/20">
          <form onSubmit={handleSaveGoals} className="space-y-4">
            <h4 className="font-bold text-emerald-800 text-lg">Personaliza tus Metas de Salud</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Objetivo de Calorías</label>
                <input
                  type="number" required min="500" max="6000"
                  value={tempGoals.calories}
                  onChange={(e) => setTempGoals({ ...tempGoals, calories: Number(e.target.value) })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Peso Objetivo (kg)</label>
                <input
                  type="number" required step="0.1" min="30" max="250"
                  value={tempGoals.weight}
                  onChange={(e) => setTempGoals({ ...tempGoals, weight: Number(e.target.value) })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Meta de Agua (Vasos)</label>
                <input
                  type="number" required min="1" max="30"
                  value={tempGoals.water}
                  onChange={(e) => setTempGoals({ ...tempGoals, water: Number(e.target.value) })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="submit" variant="primary">Guardar Nuevas Metas</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
            <Apple className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consumidas</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalCaloriesIn} kcal</h3>
            <p className="text-xs text-slate-500">{todayDietLogs.length} alimentos hoy</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-500">
            <Flame className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quemadas</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalCaloriesOut} kcal</h3>
            <p className="text-xs text-slate-500">{todayExerciseLogs.length} ejercicios hoy</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <div className="p-3 bg-white/10 rounded-xl text-white">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">Balance Neto</p>
            <h3 className="text-2xl font-bold">{netCalories} kcal</h3>
            <p className="text-xs text-white/90">Meta: {goals.calories} kcal</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-slate-700">Progreso Calórico Neto</h4>
          <span className="text-sm font-medium text-slate-500">
            {netCalories} / {goals.calories} kcal
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${netCalories > goals.calories ? 'bg-rose-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, Math.max(0, (netCalories / goals.calories) * 100))}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {netCalories > goals.calories
            ? "Has superado tu objetivo calórico de hoy."
            : `Te quedan ${goals.calories - netCalories} kcal disponibles.`}
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-500" /> Registro de Agua
              </h4>
              <span className="text-sm font-bold text-blue-600">{waterGlasses} / {goals.water} Vasos</span>
            </div>
            <div className="flex gap-2 justify-center py-4 flex-wrap">
              {[...Array(Math.max(goals.water, 10))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleUpdateWater(i < waterGlasses ? -1 : 1)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    i < waterGlasses
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-100 scale-105'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  💧
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button onClick={() => handleUpdateWater(-1)} variant="secondary" className="px-3 py-1 text-xs">-1 Vaso</Button>
            <Button onClick={() => handleUpdateWater(1)} variant="primary" className="px-3 py-1 text-xs">+1 Vaso</Button>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
              <Scale className="w-5 h-5 text-emerald-500" /> Control del Peso
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-slate-500">Peso Inicial</span>
                <span className="text-sm font-semibold text-slate-700">{startWeight ? `${startWeight} kg` : "Pendiente"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-slate-500">Peso Actual</span>
                <span className="text-sm font-semibold text-slate-700">{currentWeight ? `${currentWeight} kg` : "Pendiente"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-slate-500">Peso Objetivo</span>
                <span className="text-sm font-semibold text-emerald-600">{goals.weight} kg</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center text-xs text-slate-500">
            <span>Diferencia total:</span>
            {startWeight && currentWeight ? (
              <span className={`font-semibold ${currentWeight <= startWeight ? 'text-emerald-500' : 'text-rose-500'}`}>
                {currentWeight - startWeight > 0 ? '+' : ''}{(currentWeight - startWeight).toFixed(1)} kg
              </span>
            ) : "Registra tu peso"}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderDiet = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Alimentación Diaria</h2>
        <p className="text-sm text-slate-500">Lleva el control de tus platos. Mostrando registros del <strong>{newDate}</strong>.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-500" /> Registrar Alimento
          </h3>
          <form onSubmit={handleAddFood} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Momento del Día</label>
              <select
                value={newFood.type}
                onChange={(e) => setNewFood({ ...newFood, type: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              >
                <option>Desayuno</option>
                <option>Almuerzo</option>
                <option>Merienda</option>
                <option>Cena</option>
                <option>Snack</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Nombre del Plato/Alimento</label>
              <input
                type="text" required placeholder="Ej. Revuelto de huevos con espinacas"
                value={newFood.name}
                onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Calorías (kcal)</label>
                <input
                  type="number" required min="0" placeholder="0"
                  value={newFood.calories}
                  onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Proteínas (g)</label>
                <input
                  type="number" min="0" placeholder="Opcional"
                  value={newFood.protein}
                  onChange={(e) => setNewFood({ ...newFood, protein: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
            </div>
            <Button type="submit" variant="primary" className="w-full">Añadir Alimento</Button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-slate-700 mb-4">Platos del {newDate}</h3>
          {filteredDietLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <Apple className="w-12 h-12 mx-auto mb-2 opacity-35" />
              Aún no has registrado ningún alimento para esta fecha.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Tipo</th>
                    <th className="pb-3 font-semibold">Alimento</th>
                    <th className="pb-3 font-semibold">Calorías</th>
                    <th className="pb-3 font-semibold">Proteína</th>
                    <th className="pb-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700 text-sm">
                  {filteredDietLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 font-medium">{log.name}</td>
                      <td className="py-3 font-semibold text-slate-800">{log.calories} kcal</td>
                      <td className="py-3 text-slate-500">{log.protein ? `${log.protein}g` : '-'}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteFood(log.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );

  const renderExercise = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Entrenamiento y Deporte</h2>
        <p className="text-sm text-slate-500">Mostrando registros del <strong>{newDate}</strong>.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-rose-500" /> Registrar Deporte
          </h3>
          <form onSubmit={handleAddExercise} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Tipo de Ejercicio</label>
              <select
                value={newExercise.type}
                onChange={(e) => setNewExercise({ ...newExercise, type: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm"
              >
                <option>Cardio</option>
                <option>Fuerza / Musculación</option>
                <option>Flexibilidad / Yoga</option>
                <option>HIIT</option>
                <option>Paseo / Actividad Diaria</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Nombre de la actividad</label>
              <input
                type="text" required placeholder="Ej. Correr en cinta"
                value={newExercise.name}
                onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Duración (min)</label>
                <input
                  type="number" placeholder="Ej. 45"
                  value={newExercise.duration}
                  onChange={(e) => setNewExercise({ ...newExercise, duration: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Quemadas (kcal)</label>
                <input
                  type="number" required placeholder="Ej. 300"
                  value={newExercise.caloriesBurned}
                  onChange={(e) => setNewExercise({ ...newExercise, caloriesBurned: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-100 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
            >
              Añadir Ejercicio
            </button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-slate-700 mb-4">Ejercicios del {newDate}</h3>
          {filteredExerciseLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <Flame className="w-12 h-12 mx-auto mb-2 opacity-35" />
              No has añadido entrenamientos para esta fecha.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Tipo</th>
                    <th className="pb-3 font-semibold">Actividad</th>
                    <th className="pb-3 font-semibold">Duración</th>
                    <th className="pb-3 font-semibold">Gasto</th>
                    <th className="pb-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700 text-sm">
                  {filteredExerciseLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 font-medium">{log.name}</td>
                      <td className="py-3 text-slate-500">{log.duration ? `${log.duration} min` : '-'}</td>
                      <td className="py-3 font-semibold text-rose-600">{log.caloriesBurned} kcal</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteExercise(log.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );

  const renderWeight = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Evolución de Peso</h2>
        <p className="text-sm text-slate-500">Registra tu peso periódicamente para analizar el progreso.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-500" /> Registrar Peso
          </h3>
          <form onSubmit={handleAddWeight} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Peso en Kilogramos (kg)</label>
              <input
                type="number" step="0.1" required placeholder="Ej. 78.4"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-100 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
            >
              Registrar Peso del {newDate}
            </button>
          </form>

          <div className="mt-6 border-t pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Historial de Pesos</h4>
            {weightLogs.length === 0 ? (
              <p className="text-xs text-slate-400">No hay registros de peso guardados.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {weightLogs.map((log) => (
                  <div key={log.date} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xs">
                    <span className="text-slate-500">{log.date}</span>
                    <span className="font-bold text-slate-700">{log.weight} kg</span>
                    <button
                      onClick={() => handleDeleteWeight(log.date)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">Gráfica de Progreso</h3>
            <p className="text-xs text-slate-400 mb-4">Compara tu tendencia con tu Peso Objetivo de {goals.weight} kg.</p>
          </div>

          <div className="h-72 w-full">
            {weightLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <Scale className="w-12 h-12 mb-2 opacity-35" />
                Registra tu peso para visualizar la gráfica.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#f1f5f9', fontSize: '12px' }} />
                  <ReferenceLine y={goals.weight} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Meta', fill: '#10b981', fontSize: 10, position: 'insideBottomRight' }} />
                  <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} name="Peso (kg)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderCookGem = () => (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-300">
      <header className="flex-none">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ChefHat className="w-7 h-7 text-emerald-500" /> CookGem: Tu Chef Personal
        </h2>
        <p className="text-sm text-slate-500">Pídele recetas saludables basadas en la "Dieta de los Dados".</p>
      </header>

      <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 overflow-y-auto space-y-4 max-h-[500px]">
        {cookGemMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 text-sm ${
              msg.role === 'user'
                ? 'bg-emerald-500 text-white rounded-br-none shadow-md shadow-emerald-100'
                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none shadow-sm prose prose-sm leading-relaxed'
            }`}>
              <p className="whitespace-pre-line">
                {msg.text.split('**').map((chunk, idx) => idx % 2 === 1 ? <strong key={idx}>{chunk}</strong> : chunk)}
              </p>
            </div>
          </div>
        ))}
        {isLoadingRecipe && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
              <span className="text-xs text-slate-500 font-medium">CookGem está cocinando una respuesta...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-none flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setCookGemInput('¿Qué es la Dieta de los Dados?')}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-medium shrink-0 transition">
          🎲 ¿Qué es la Dieta de los Dados?
        </button>
        <button onClick={() => setCookGemInput('Dame ideas de almuerzo con pollo, arroz y verduras')}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-medium shrink-0 transition">
          🍗 Menú con Pollo
        </button>
        <button onClick={() => setCookGemInput('¿Cómo calculo mi déficit calórico ideal?')}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-medium shrink-0 transition">
          ⚖️ Déficit Calórico
        </button>
      </div>

      <form onSubmit={handleSendCookGem} className="flex-none flex gap-2">
        <input
          type="text"
          placeholder="Dime qué ingredientes tienes o qué receta buscas..."
          value={cookGemInput}
          onChange={(e) => setCookGemInput(e.target.value)}
          disabled={isLoadingRecipe}
          className="flex-1 p-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-sm"
        />
        <button
          type="submit"
          disabled={!cookGemInput.trim() || isLoadingRecipe}
          className="p-3.5 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-100 rounded-xl transition-all flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );

  // -----------------------------------------------------------
  // Render principal (usuario logueado)
  // -----------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 sm:pb-6">
      <nav className="sticky top-0 z-30 bg-white border-b border-slate-100 py-3 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 bg-emerald-500 text-white rounded-xl shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-md font-bold text-slate-800 truncate">Mi Plan Saludable</h1>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center gap-1">
                ● En la Nube
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="text-xs font-semibold text-slate-600 bg-transparent focus:outline-none"
              />
            </div>
            <button
              onClick={handleLogout}
              title={`Cerrar sesión (${user.email})`}
              className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
            {user.photoURL && (
              <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full shrink-0" referrerPolicy="no-referrer" />
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'diet' && renderDiet()}
        {activeTab === 'exercise' && renderExercise()}
        {activeTab === 'weight' && renderWeight()}
        {activeTab === 'cookgem' && renderCookGem()}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-2 px-4 shadow-lg z-40 sm:sticky sm:bottom-0 sm:mt-12 sm:border-0 sm:shadow-none sm:bg-transparent">
        <div className="max-w-xl mx-auto bg-white sm:border sm:border-slate-100 sm:shadow-lg rounded-2xl p-1.5 flex justify-between gap-1">
          {[
            { id: 'dashboard', icon: Home, label: 'Resumen' },
            { id: 'diet', icon: Apple, label: 'Dieta' },
            { id: 'exercise', icon: Flame, label: 'Deporte' },
            { id: 'weight', icon: Scale, label: 'Peso' },
            { id: 'cookgem', icon: ChefHat, label: 'CookGem' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-2.5 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
                activeTab === id ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] sm:text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {showInstallGuide && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl relative">
            <button
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              📱 Cómo instalar en tu móvil
            </h3>

            {isIOS ? (
              <div className="space-y-4 text-sm text-slate-600">
                <p>En dispositivos <strong>iOS (iPhone/iPad)</strong>:</p>
                <ol className="list-decimal list-inside space-y-2.5">
                  <li>Abre esta página en <strong className="text-slate-800">Safari</strong>.</li>
                  <li>Pulsa el botón de <strong>Compartir</strong> 📤 en la barra inferior.</li>
                  <li>Desliza y selecciona <strong>"Añadir a la pantalla de inicio"</strong> ➕.</li>
                  <li>¡Listo! Aparecerá con su icono en tu pantalla de inicio.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-slate-600">
                <p>En dispositivos <strong>Android (Chrome)</strong>:</p>
                <ol className="list-decimal list-inside space-y-2.5">
                  <li>Pulsa el menú <strong className="text-slate-800">(los tres puntos ⋮)</strong> arriba a la derecha.</li>
                  <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</li>
                  <li>Confirma y se agregará al cajón de aplicaciones.</li>
                </ol>
              </div>
            )}

            <button
              onClick={() => setShowInstallGuide(false)}
              className="mt-6 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-emerald-100"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}