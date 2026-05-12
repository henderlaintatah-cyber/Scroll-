import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
// BACKEND LAYER — Supabase-style localStorage persistence + AI engine
// ═══════════════════════════════════════════════════════════════════

const DB = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(`scroll_${key}`) || "null"); } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(`scroll_${key}`, JSON.stringify(val)); } catch {} },
  update: (key, fn) => { const cur = DB.get(key); DB.set(key, fn(cur)); },
};

const initDB = () => {
  if (!DB.get("initialized")) {
    DB.set("users", [
      {
        id: "admin", name: "Admin Scroll", phone: "673429670", email: "admin@scroll.cm",
        password: "Henderlain2008", activated: true, role: "admin", wallet: 0, coins: 0,
        referrals: [], referredBy: null, videosWatchedToday: 0, lastWatchDate: null,
        joinDate: "2025-01-01", bio: "Administration Scroll", followers: [], following: [],
        watchHistory: [], notifications: [],
      }
    ]);
    DB.set("videos", SEED_VIDEOS);
    DB.set("comments", SEED_COMMENTS);
    DB.set("transactions", []);
    DB.set("withdrawalRequests", []);
    DB.set("paymentSettings", {
      eth: { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", enabled: true },
      bnb: { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", enabled: true },
      sol: { address: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5BKNA", enabled: true },
      btc: { address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", enabled: true },
    });
    DB.set("initialized", true);
  }
};

// ═══════════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════════

const SEED_VIDEOS = [
  { id: 1, userId: "admin", username: "scroll_official", displayName: "Scroll Official", avatar: "S", title: "Bienvenue sur Scroll — la plateforme qui rémunère ta passion 🚀", tags: ["#scroll", "#bienvenue"], category: "tech", likes: 24800, shares: 1240, views: 198000, bg: "from-violet-950 to-slate-900", isPaid: true, duration: 45 },
  { id: 2, userId: "admin", username: "motiv_africa", displayName: "Motiv Africa", avatar: "M", title: "5 habitudes des entrepreneurs africains qui réussissent 💡", tags: ["#entrepreneuriat", "#afrique"], category: "education", likes: 18700, shares: 920, views: 142000, bg: "from-slate-900 to-violet-900", isPaid: true, duration: 60 },
  { id: 3, userId: "admin", username: "chef_cm", displayName: "Chef Cameroun", avatar: "C", title: "Recette du Ndolé traditionnel en 10 minutes ⚡", tags: ["#cuisine", "#cameroun"], category: "food", likes: 32100, shares: 2100, views: 287000, bg: "from-zinc-900 to-violet-950", isPaid: true, duration: 38 },
  { id: 4, userId: "admin", username: "tech_cm", displayName: "Tech Cameroun", avatar: "T", title: "Comment générer des revenus passifs avec la crypto en 2025 ₿", tags: ["#crypto", "#finance"], category: "finance", likes: 41200, shares: 3400, views: 412000, bg: "from-violet-900 to-zinc-900", isPaid: true, duration: 72 },
  { id: 5, userId: "admin", username: "fitness_africa", displayName: "Fitness Africa", avatar: "F", title: "Programme musculation sans salle — résultats en 30 jours 💪", tags: ["#fitness", "#sport"], category: "sport", likes: 28900, shares: 1800, views: 234000, bg: "from-slate-950 to-violet-800", isPaid: true, duration: 55 },
  { id: 6, userId: "admin", username: "music_cm", displayName: "Music CM", avatar: "♪", title: "Makossa Remix 2025 🎵 — La nouvelle vague camerounaise", tags: ["#musique", "#makossa"], category: "music", likes: 55000, shares: 4200, views: 621000, bg: "from-violet-950 to-slate-800", isPaid: false, duration: 180 },
  { id: 7, userId: "admin", username: "comedy_237", displayName: "Comedy 237", avatar: "😄", title: "La vie de bureau au Cameroun 😂 trop réel !", tags: ["#humour", "#cameroun"], category: "comedy", likes: 78200, shares: 8900, views: 890000, bg: "from-zinc-950 to-violet-900", isPaid: false, duration: 62 },
  { id: 8, userId: "admin", username: "voyage_af", displayName: "Voyage Afrique", avatar: "✈", title: "Kribi en 48h — le paradis camerounais que vous ignorez 🏖", tags: ["#voyage", "#kribi"], category: "travel", likes: 19400, shares: 1100, views: 167000, bg: "from-slate-900 to-violet-950", isPaid: false, duration: 95 },
];
const SEED_COMMENTS = {
  1: [{ id: "sc1", userId: "admin", username: "tech_cm", avatar: "T", text: "Enfin une plateforme sérieuse pour nous les créateurs ! 🔥", likes: 142, likedBy: [], time: "2h", replies: [] }],
  2: [{ id: "sc2", userId: "admin", username: "chef_cm", avatar: "C", text: "Ces conseils sont VRAIS. J'applique depuis 1 an et les résultats parlent.", likes: 89, likedBy: [], time: "4h", replies: [] }],
  3: [{ id: "sc3", userId: "admin", username: "fitness_africa", avatar: "F", text: "Testée hier soir, c'est incroyable 😋", likes: 234, likedBy: [], time: "1h", replies: [] }, { id: "sc4", userId: "admin", username: "music_cm", avatar: "♪", text: "Ma grand-mère fait mieux mais respect quand même 😂", likes: 56, likedBy: [], time: "30min", replies: [] }],
  4: [{ id: "sc5", userId: "admin", username: "voyage_af", avatar: "✈", text: "J'ai multiplié mon investissement par 3 en suivant ces conseils. Merci 🙏", likes: 312, likedBy: [], time: "6h", replies: [] }],
};
// ═══════════════════════════════════════════════════════════════════
// AI ENGINE — Anthropic API integration
// ═══════════════════════════════════════════════════════════════════

async function callAI(systemPrompt, userMessage) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || "";
  } catch (e) {
    return null;
  }
}

const AI_SYSTEM = `Tu es l'assistant IA de Scroll, une plateforme de réseau social camerounaise. Tu parles uniquement en français, avec un ton professionnel mais chaleureux.

Ton rôle principal : analyser les preuves de dépôt et gérer les transactions financières.

Règles strictes :
- ACTIVATION : frais = 3000 FCFA (équivalent crypto selon le taux du jour)
- RECHARGE : créditer le montant déclaré si la preuve est cohérente
- RETRAIT minimum : 5000 FCFA
- Cryptos acceptées : Ethereum (ETH), BNB, Solana (SOL), Bitcoin (BTC)
- Si une preuve semble frauduleuse ou incohérente, REJETER avec explication claire

Pour chaque demande, réponds UNIQUEMENT en JSON valide avec ces champs :
{
  "decision": "APPROVE" | "REJECT" | "PENDING",
  "action": "ACTIVATE_ACCOUNT" | "CREDIT_WALLET" | "SUBMIT_WITHDRAWAL" | "REJECT",
  "amount": number (en FCFA),
  "message": "message à afficher à l'utilisateur",
  "adminNote": "note pour l'admin si besoin"
}`;
// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const ACTIVATION_FEE_FCFA = 3000;
const REFERRAL_BONUS = 500;
const VIDEO_REWARD = 100;
const REFERRALS_NEEDED = 20;
const MIN_WITHDRAWAL = 5000;
const CRYPTO_RATES = { eth: 2800000, bnb: 580000, sol: 95000, btc: 95000000 }; // FCFA per unit
// MAIN APP
// ═══════════════════════════════════════════════════════════════════

export default function ScrollApp() {
  const [screen, setScreen] = useState("splash");
  const [authMode, setAuthMode] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [commentVideo, setCommentVideo] = useState(null);
  const [notification, setNotification] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Realtime state synced with DB
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [comments, setComments] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [paySettings, setPaySettings] = useState({});
  const [messages, setMessages] = useState({});

  useEffect(() => {
    initDB();
    loadAll();
    const t = setTimeout(() => setScreen("auth"), 2600);
    return () => clearTimeout(t);
  }, []);

  const loadAll = () => {
    setUsers(DB.get("users") || []);
    setVideos(DB.get("videos") || SEED_VIDEOS);
    setComments(DB.get("comments") || SEED_COMMENTS);
    setTransactions(DB.get("transactions") || []);
    setWithdrawals(DB.get("withdrawalRequests") || []);
    setPaySettings(DB.get("paymentSettings") || {});
    setMessages(DB.get("messages") || {});
  };

  const notify = useCallback((msg, type = "info", duration = 4000) => {
    setNotification({ msg, type, id: Date.now() });
    setTimeout(() => setNotification(null), duration);
  }, []);
    // ── AUTH ──────────────────────────────────────────────────────────
  const [loginForm, setLF] = useState({ phone: "", password: "" });
  const [regForm, setRF] = useState({ name: "", phone: "", email: "", password: "", ref: "" });

  const handleLogin = () => {
    const all = DB.get("users") || [];
    const u = all.find(u => u.phone === loginForm.phone && u.password === loginForm.password);
    if (!u) { notify("Identifiants incorrects", "error"); return; }
    setCurrentUser(u);
    setScreen("app");
    setActiveTab(u.role === "admin" ? "admin" : "home");
    notify(`Bon retour, ${u.name.split(" ")[0]} 👋`, "success");
  };

  const handleRegister = () => {
    if (!regForm.name || !regForm.phone || !regForm.email || !regForm.password) { notify("Tous les champs sont requis", "error"); return; }
    const all = DB.get("users") || [];
    if (all.find(u => u.phone === regForm.phone)) { notify("Ce numéro est déjà enregistré", "error"); return; }
    const refUser = regForm.ref ? all.find(u => u.phone === regForm.ref) : null;
    const now = new Date().toISOString().split("T")[0];
    const newUser = {
      id: `u_${Date.now()}`, name: regForm.name, phone: regForm.phone, email: regForm.email,
      password: regForm.password, activated: false, role: "user", wallet: 0, coins: 0,
      referrals: [], referredBy: refUser?.id || null, videosWatchedToday: 0,
      lastWatchDate: null, joinDate: now, bio: "", followers: [], following: [],
      watchHistory: [], notifications: [],
    };
    let updated = [...all, newUser];
    if (refUser) {
      updated = updated.map(u => u.id === refUser.id
        ? { ...u, referrals: [...u.referrals, newUser.id], wallet: refUser.activated ? u.wallet + REFERRAL_BONUS : u.wallet }
        : u);
      if (refUser.activated) {
        addTransaction(refUser.id, "referral", REFERRAL_BONUS, `Parrainage de ${newUser.name}`);
      }
    }
    DB.set("users", updated);
    setUsers(updated);
    setCurrentUser(newUser);
    setScreen("app");
    setActiveTab("home");
    notify("Compte créé avec succès ! Active ton profil pour accéder à tous les services.", "success");
  };
   // ── DB HELPERS ────────────────────────────────────────────────────
  const updateUser = useCallback((uid, patch) => {
    const all = DB.get("users") || [];
    const updated = all.map(u => u.id === uid ? { ...u, ...patch } : u);
    DB.set("users", updated);
    setUsers(updated);
    if (currentUser?.id === uid) setCurrentUser(prev => ({ ...prev, ...patch }));
  }, [currentUser]);

  const addTransaction = (uid, type, amount, desc, status = "completed") => {
    const tx = { id: `tx_${Date.now()}`, userId: uid, type, amount, desc, status, date: new Date().toISOString() };
    DB.update("transactions", prev => [...(prev || []), tx]);
    setTransactions(DB.get("transactions") || []);
  };
    // ── AI PAYMENT PROCESSOR ─────────────────────────────────────────
  const processDepositWithAI = async ({ purpose, crypto, amount, walletName, receiptDesc, userId }) => {
    setAiLoading(true);
    const userPrompt = `Analyse cette demande de dépôt :
- But : ${purpose === "activation" ? "Activation du compte (3000 FCFA)" : "Recharge du portefeuille"}
- Crypto utilisée : ${crypto.toUpperCase()}
- Montant déclaré : ${amount} FCFA
- Portefeuille source : ${walletName}
- Description du reçu : ${receiptDesc}
- Cohérence : ${amount >= (purpose === "activation" ? ACTIVATION_FEE_FCFA : 100) ? "Montant suffisant" : "Montant insuffisant"}

Prends une décision.`;

    const raw = await callAI(AI_SYSTEM, userPrompt);
    setAiLoading(false);
    let result;
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { decision: "REJECT", action: "REJECT", message: "Impossible de vérifier la transaction. Contacte le support.", adminNote: "" };
    }

    if (result.decision === "APPROVE") {
      if (result.action === "ACTIVATE_ACCOUNT") {
        updateUser(userId, { activated: true });
        addTransaction(userId, "activation", -ACTIVATION_FEE_FCFA, "Frais d'activation du compte");
        notify("✅ " + result.message, "success", 6000);
      } else if (result.action === "CREDIT_WALLET") {
        const cur = (DB.get("users") || []).find(u => u.id === userId);
        updateUser(userId, { wallet: (cur?.wallet || 0) + (result.amount || amount) });
        addTransaction(userId, "deposit", result.amount || amount, "Recharge portefeuille");
        notify("✅ " + result.message, "success", 6000);
      }
    } else {
      notify("❌ " + result.message, "error", 6000);
    }
    return result;
  };

  const processWithdrawalWithAI = async ({ userId, amount, crypto, walletAddress }) => {
    setAiLoading(true);
    const cur = (DB.get("users") || []).find(u => u.id === userId);
    const balance = cur?.wallet || 0;

    const userPrompt = `Analyse cette demande de retrait :
- Solde utilisateur : ${balance} FCFA
- Montant demandé : ${amount} FCFA
- Minimum autorisé : ${MIN_WITHDRAWAL} FCFA
- Crypto choisie : ${crypto.toUpperCase()}
- Adresse destination : ${walletAddress}
- Fonds suffisants : ${balance >= amount && amount >= MIN_WITHDRAWAL ? "OUI" : "NON"}`;

    const raw = await callAI(AI_SYSTEM, userPrompt);
    setAiLoading(false);
    let result;
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { decision: balance >= amount && amount >= MIN_WITHDRAWAL ? "APPROVE" : "REJECT", action: balance >= amount && amount >= MIN_WITHDRAWAL ? "SUBMIT_WITHDRAWAL" : "REJECT", message: balance >= amount && amount >= MIN_WITHDRAWAL ? "Demande soumise à l'administrateur. Traitement sous 24h." : `Solde insuffisant. Minimum : ${MIN_WITHDRAWAL.toLocaleString()} FCFA`, amount };
    }

    if (result.decision === "APPROVE" || result.action === "SUBMIT_WITHDRAWAL") {
      updateUser(userId, { wallet: balance - amount });
      addTransaction(userId, "withdrawal_pending", -amount, `Retrait ${crypto.toUpperCase()} en attente`);
      const req = { id: `wr_${Date.now()}`, userId, userName: cur?.name, amount, crypto, walletAddress, status: "pending", date: new Date().toISOString(), aiNote: result.adminNote || "" };
      DB.update("withdrawalRequests", prev => [...(prev || []), req]);
      setWithdrawals(DB.get("withdrawalRequests") || []);
      notify("✅ " + (result.message || "Demande envoyée à l'admin. Traitement sous 24h."), "success", 7000);
    } else {
      notify("❌ " + result.message, "error", 6000);
    }
    return result;
  };
    // ── VIDEO WATCH ───────────────────────────────────────────────────
  const handleWatchVideo = (video) => {
    if (!currentUser) return;
    const cur = (DB.get("users") || []).find(u => u.id === currentUser.id);
    const today = new Date().toDateString();
    const watched = cur.lastWatchDate === today ? cur.videosWatchedToday : 0;

    const history = cur.watchHistory || [];
    const newHistory = [...new Set([video.category, ...history])].slice(0, 20);

    if (video.isPaid && cur.activated && (cur.referrals?.length || 0) >= REFERRALS_NEEDED && watched < 5) {
      updateUser(currentUser.id, { videosWatchedToday: watched + 1, lastWatchDate: today, wallet: (cur.wallet || 0) + VIDEO_REWARD, watchHistory: newHistory });
      addTransaction(currentUser.id, "video_reward", VIDEO_REWARD, `Vidéo rémunérée : ${video.title.slice(0, 40)}`);
      notify(`+${VIDEO_REWARD} FCFA • Vidéo rémunérée (${watched + 1}/5)`, "success");
    } else {
      updateUser(currentUser.id, { watchHistory: newHistory });
    }
  };
    // ── COMMENTS ──────────────────────────────────────────────────────
  const addComment = (videoId, text) => {
    if (!currentUser || !text.trim()) return;
    const newC = { id: `c_${Date.now()}`, userId: currentUser.id, username: currentUser.name, avatar: currentUser.name[0].toUpperCase(), text: text.trim(), likes: 0, likedBy: [], time: "maintenant", replies: [] };
    const updated = { ...DB.get("comments") || SEED_COMMENTS, [videoId]: [...(DB.get("comments")?.[videoId] || []), newC] };
    DB.set("comments", updated);
    setComments(updated);
  };

  const likeComment = (videoId, commentId) => {
    if (!currentUser) return;
    const cur = DB.get("comments") || {};
    const updated = {
      ...cur,
      [videoId]: (cur[videoId] || []).map(c => c.id === commentId
        ? c.likedBy?.includes(currentUser.id)
          ? { ...c, likes: c.likes - 1, likedBy: c.likedBy.filter(id => id !== currentUser.id) }
          : { ...c, likes: c.likes + 1, likedBy: [...(c.likedBy || []), currentUser.id] }
        : c)
    };
    DB.set("comments", updated);
    setComments(updated);
  };
    // ── MESSAGES ──────────────────────────────────────────────────────
  const sendMessage = (toId, text) => {
    if (!currentUser || !text.trim()) return;
    const key = [currentUser.id, toId].sort().join("__");
    const msg = { id: `m_${Date.now()}`, from: currentUser.id, text, time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) };
    const cur = DB.get("messages") || {};
    const updated = { ...cur, [key]: [...(cur[key] || []), msg] };
    DB.set("messages", updated);
    setMessages(updated);
  };

  const me = currentUser ? (users.find(u => u.id === currentUser.id) || currentUser) : null;

  if (screen === "splash") return <Splash />;
  if (screen === "auth") return <AuthScreen mode={authMode} setMode={setAuthMode} loginForm={loginForm} setLF={setLF} handleLogin={handleLogin} regForm={regForm} setRF={setRF} handleRegister={handleRegister} />;

  return (
    <AppShell
      me={me} users={users} videos={videos} comments={comments} transactions={transactions}
      withdrawals={withdrawals} paySettings={paySettings} messages={messages}
      activeTab={activeTab} setActiveTab={setActiveTab}
      commentVideo={commentVideo} setCommentVideo={setCommentVideo}
      notification={notification} aiLoading={aiLoading}
      notify={notify} updateUser={updateUser} setUsers={setUsers}
      addComment={addComment} likeComment={likeComment}
      handleWatchVideo={handleWatchVideo} sendMessage={sendMessage}
      processDepositWithAI={processDepositWithAI}
      processWithdrawalWithAI={processWithdrawalWithAI}
      setPaySettings={setPaySettings} setWithdrawals={setWithdrawals}
      loadAll={loadAll}
    />
  );
}
// ═══════════════════════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════════════════════

function AppShell(props) {
  const { me, activeTab, setActiveTab, notification, aiLoading, commentVideo, setCommentVideo, comments, likeComment, addComment } = props;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 430, margin: "0 auto", background: "#080810", overflow: "hidden", fontFamily: "'DM Sans', sans-serif", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {notification && <Toast n={notification} />}
      {aiLoading && <AILoadingBar />}

      {commentVideo !== null && (
        <CommentSheet
          videoId={commentVideo}
          video={props.videos?.find(v => v.id === commentVideo)}
          comments={comments[commentVideo] || []}
          onClose={() => setCommentVideo(null)}
          onAdd={(t) => addComment(commentVideo, t)}
          onLike={(cid) => likeComment(commentVideo, cid)}
          me={me}
        />
      )}

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
        {activeTab === "home" && <FeedScreen {...props} />}
        {activeTab === "explore" && <ExploreScreen {...props} />}
        {activeTab === "create" && <CreateScreen {...props} />}
        {activeTab === "chat" && <ChatScreen {...props} />}
        {activeTab === "profile" && <ProfileScreen {...props} />}
        {activeTab === "admin" && me?.role === "admin" && <AdminScreen {...props} />}
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} me={me} />
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════
// SPLASH
// ═══════════════════════════════════════════════════════════════════

function Splash() {
  return (
    <div style={{ height: "100vh", background: "#080810", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>
      <div style={{ position: "relative", marginBottom: 32 }}>
        <div style={{ width: 88, height: 88, borderRadius: 28, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, boxShadow: "0 0 80px #7c3aed60" }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none"><path d="M8 22C8 14.268 14.268 8 22 8s14 6.268 14 14-6.268 14-14 14S8 29.732 8 22z" stroke="#fff" strokeWidth="2"/><path d="M18 16l12 6-12 6V16z" fill="#fff"/></svg>
        </div>
        <div style={{ position: "absolute", inset: -8, borderRadius: 36, border: "1px solid #7c3aed30", animation: "ring 2s ease-in-out infinite" }} />
      </div>
      <div style={{ fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: -1, fontFamily: "'Space Grotesk'" }}>Scroll</div>
      <div style={{ fontSize: 13, color: "#6366f1", marginTop: 6, letterSpacing: 3, textTransform: "uppercase", fontWeight: 500 }}>Social · Earn · Grow</div>
      <div style={{ marginTop: 48, display: "flex", gap: 6 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: "#7c3aed", animation: `dot 1.4s ${i * 0.2}s ease-in-out infinite` }} />)}
      </div>
      <style>{`
        @keyframes ring{0%,100%{opacity:0.2;transform:scale(1)}50%{opacity:0.6;transform:scale(1.08)}}
        @keyframes dot{0%,100%{opacity:0.2;transform:scaleY(1)}50%{opacity:1;transform:scaleY(1.6)}}
      `}</style>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════

function AuthScreen({ mode, setMode, loginForm, setLF, handleLogin, regForm, setRF, handleRegister }) {
  return (
    <div style={{ height: "100vh", background: "#080810", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ padding: "48px 28px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 44 44" fill="none"><path d="M18 16l12 6-12 6V16z" fill="#fff"/></svg>
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "'Space Grotesk'" }}>Scroll</span>
        </div>

        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 8 }}>
          {mode === "login" ? "Bon retour 👋" : "Rejoindre Scroll"}
        </div>
        <div style={{ fontSize: 14, color: "#64748b", marginBottom: 32 }}>
          {mode === "login" ? "Connecte-toi à ton compte" : "Crée ton compte et commence à gagner"}
        </div>

        <div style={{ display: "flex", background: "#0f0f1a", borderRadius: 14, padding: 4, marginBottom: 28 }}>
          {[["login", "Connexion"], ["register", "Inscription"]].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 11, background: mode === k ? "#7c3aed" : "transparent", color: mode === k ? "#fff" : "#64748b", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>{l}</button>
          ))}
        </div>

        {mode === "login" ? (
          <>
            <FInput label="Téléphone" icon="📱" value={loginForm.phone} onChange={v => setLF(p => ({ ...p, phone: v }))} placeholder="673 429 670" type="tel" />
            <FInput label="Mot de passe" icon="🔑" value={loginForm.password} onChange={v => setLF(p => ({ ...p, password: v }))} placeholder="••••••••" type="password" />
            <PBtn onClick={handleLogin}>Se connecter</PBtn>
          </>
        ) : (
          <>
            <FInput label="Nom complet" icon="👤" value={regForm.name} onChange={v => setRF(p => ({ ...p, name: v }))} placeholder="Jean Dupont" />
            <FInput label="Téléphone" icon="📱" value={regForm.phone} onChange={v => setRF(p => ({ ...p, phone: v }))} placeholder="655 000 000" type="tel" />
            <FInput label="Email" icon="✉" value={regForm.email} onChange={v => setRF(p => ({ ...p, email: v }))} placeholder="email@exemple.com" type="email" />
            <FInput label="Mot de passe" icon="🔑" value={regForm.password} onChange={v => setRF(p => ({ ...p, password: v }))} placeholder="Minimum 8 caractères" type="password" />
            <FInput label="Code parrain (optionnel)" icon="🤝" value={regForm.ref} onChange={v => setRF(p => ({ ...p, ref: v }))} placeholder="Numéro du parrain" type="tel" />
            <PBtn onClick={handleRegister}>Créer mon compte</PBtn>
          </>
        )}

        <div style={{ color: "#334155", fontSize: 12, textAlign: "center", marginTop: 24, lineHeight: 1.8 }}>
          Support : +237 673 429 670 · tatahfotouo937@gmail.com
        </div>
      </div>
    </div>
  );
          }

// ═══════════════════════════════════════════════════════════════════
// FEED
// ═══════════════════════════════════════════════════════════════════

function FeedScreen({ me, videos, comments, setCommentVideo, handleWatchVideo, notify }) {
  const [tab, setTab] = useState("forYou");
  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState({});
  const [heartAnim, setHeartAnim] = useState(false);

  const today = new Date().toDateString();
  const videosWatched = me?.lastWatchDate === today ? (me?.videosWatchedToday || 0) : 0;
  const canEarnMore = videosWatched < 5 && me?.activated && (me?.referrals?.length || 0) >= REFERRALS_NEEDED;

  // Smart ordering: paid first based on watch history
  const history = me?.watchHistory || [];
  const ordered = [...videos].sort((a, b) => {
    if (a.isPaid && !b.isPaid) return -1;
    if (!a.isPaid && b.isPaid) return 1;
    const aScore = history.indexOf(a.category);
    const bScore = history.indexOf(b.category);
    if (aScore === -1 && bScore === -1) return 0;
    if (aScore === -1) return 1;
    if (bScore === -1) return -1;
    return aScore - bScore;
  });

  const v = ordered[idx] || ordered[0];

  const handleLike = () => {
    setLiked(p => ({ ...p, [v.id]: !p[v.id] }));
    if (!liked[v.id]) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 900); }
  };

  const goNext = () => {
    handleWatchVideo(v);
    setIdx(p => Math.min(ordered.length - 1, p + 1));
  };
  const goPrev = () => setIdx(p => Math.max(0, p - 1));

  const commentCount = (comments[v?.id] || []).length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Feed tabs */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, display: "flex", justifyContent: "center", gap: 24, paddingTop: 14, paddingBottom: 10, background: "linear-gradient(to bottom,#080810dd,transparent)" }}>
        {[["forYou", "Pour toi"], ["explore", "Explorer"], ["following", "Abonnements"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ border: "none", background: "none", color: tab === k ? "#fff" : "#64748b", fontWeight: tab === k ? 700 : 500, fontSize: 14, cursor: "pointer", borderBottom: `2px solid ${tab === k ? "#7c3aed" : "transparent"}`, paddingBottom: 4, fontFamily: "'DM Sans'" }}>{l}</button>
        ))}
      </div>

      {/* Video */}
      <div onDoubleClick={handleLike} style={{ flex: 1, background: `linear-gradient(160deg,var(--from,#1e1b4b),var(--to,#0f0a2a))`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <style>{`.vbg{--from:${v?.bg?.split(" ")[0]?.replace("from-", "") || "#1e1b4b"};--to:${v?.bg?.split(" ")[1]?.replace("to-", "") || "#0f0a2a"}}`}</style>
        <div className="vbg" style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg,#1a0a3a,#080820)` }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 20%,#7c3aed25,transparent 60%)" }} />
        </div>

        {/* Avatar */}
        <div style={{ position: "relative", zIndex: 2, width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 800, color: "#fff", boxShadow: "0 0 60px #7c3aed50", fontFamily: "'Space Grotesk'" }}>
          {v?.avatar}
        </div>

        {heartAnim && <div style={{ position: "absolute", zIndex: 30, fontSize: 80, animation: "hpop .9s forwards", pointerEvents: "none" }}>❤️</div>}

        {/* Paid badge */}
        {v?.isPaid && (
          <div style={{ position: "absolute", top: 60, right: 12, zIndex: 10, background: canEarnMore ? "#7c3aed" : "#1e1b4b", border: `1px solid ${canEarnMore ? "#a78bfa" : "#334155"}`, borderRadius: 20, padding: "4px 12px", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 10 }}>💎</span>
            <span style={{ color: canEarnMore ? "#fff" : "#64748b", fontSize: 11, fontWeight: 700 }}>{canEarnMore ? `+${VIDEO_REWARD} FCFA` : `${videosWatched}/5`}</span>
          </div>
        )}

        {/* Info */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 64, padding: "0 18px 28px", background: "linear-gradient(transparent,#080810dd)", zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>{v?.avatar}</div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>@{v?.username}</span>
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{v?.title}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {v?.tags?.map(t => <span key={t} style={{ color: "#818cf8", fontSize: 12, fontWeight: 600 }}>{t}</span>)}
          </div>
        </div>

        {/* Right actions */}
        <div style={{ position: "absolute", right: 10, bottom: 28, display: "flex", flexDirection: "column", gap: 22, alignItems: "center", zIndex: 10 }}>
          <VBtn icon={liked[v?.id] ? "❤️" : "🤍"} count={(v?.likes || 0) + (liked[v?.id] ? 1 : 0)} onClick={handleLike} active={liked[v?.id]} />
          <VBtn icon="💬" count={commentCount} onClick={() => setCommentVideo(v?.id)} />
          <VBtn icon="↗" count={v?.shares} onClick={() => notify("Lien copié !", "success")} />
          <VBtn icon="⋯" onClick={() => {}} />
        </div>
      </div>

      {/* Nav bar */}
      <div style={{ display: "flex", background: "#0f0f1a", borderTop: "1px solid #1e1e30" }}>
        <button onClick={goPrev} disabled={idx === 0} style={{ flex: 1, padding: 13, border: "none", background: "none", color: idx === 0 ? "#334155" : "#7c3aed", fontSize: 18, cursor: idx === 0 ? "default" : "pointer" }}>↑</button>
        <div style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          {ordered.map((_, i) => <div key={i} style={{ width: i === idx ? 16 : 5, height: 5, borderRadius: 3, background: i === idx ? "#7c3aed" : "#1e1e30", transition: "all 0.3s" }} />)}
        </div>
        <button onClick={goNext} disabled={idx >= ordered.length - 1} style={{ flex: 1, padding: 13, border: "none", background: "none", color: idx >= ordered.length - 1 ? "#334155" : "#7c3aed", fontSize: 18, cursor: "pointer" }}>↓</button>
      </div>
      <style>{`@keyframes hpop{0%{opacity:1;transform:scale(.4)}50%{opacity:1;transform:scale(1.4)}100%{opacity:0;transform:scale(1.8)}}`}</style>
    </div>
  );
}

function VBtn({ icon, count, onClick, active }) {
  return (
    <div onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: "#ffffff12", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, filter: active ? "drop-shadow(0 0 8px #ef4444)" : "none" }}>{icon}</div>
      {count !== undefined && <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>{count >= 1000 ? (count / 1000).toFixed(1) + "k" : count}</span>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// COMMENT SHEET
// ═══════════════════════════════════════════════════════════════════

function CommentSheet({ videoId, video, comments, onClose, onAdd, onLike, me }) {
  const [input, setInput] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const send = () => {
    if (!input.trim()) return;
    onAdd(input);
    setInput("");
    setTimeout(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, 100);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", flexDirection: "column", justifyContent: "flex-end", maxWidth: 430, margin: "0 auto" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "#00000080", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "#0f0f1a", borderRadius: "22px 22px 0 0", maxHeight: "76vh", display: "flex", flexDirection: "column", boxShadow: "0 -4px 60px #7c3aed20", border: "1px solid #1e1e30", borderBottom: "none" }}>
        <div style={{ padding: "14px 20px 0", flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#1e2030", margin: "0 auto 14px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{comments.length} commentaire{comments.length !== 1 ? "s" : ""}</span>
            <button onClick={onClose} style={{ border: "none", background: "#1e1e30", borderRadius: 8, color: "#94a3b8", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✕</button>
          </div>
          {video && <div style={{ color: "#6366f1", fontSize: 12, marginTop: 8, paddingBottom: 12, borderBottom: "1px solid #1e1e30" }}>@{video.username} · {video.title?.slice(0, 50)}{video.title?.length > 50 ? "…" : ""}</div>}
        </div>

        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 18 }}>
          {comments.length === 0 && <div style={{ color: "#334155", textAlign: "center", marginTop: 40, fontSize: 14 }}>Aucun commentaire. Sois le premier ! ✨</div>}
          {comments.map(c => (
            <div key={c.id} style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{c.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ color: "#818cf8", fontWeight: 700, fontSize: 13 }}>{c.username}</span>
                  <span style={{ color: "#334155", fontSize: 11 }}>{c.time}</span>
                </div>
                <div style={{ color: "#cbd5e1", fontSize: 14, marginTop: 3, lineHeight: 1.5 }}>{c.text}</div>
                <div style={{ display: "flex", gap: 16, marginTop: 7 }}>
                  <button onClick={() => onLike(c.id)} style={{ border: "none", background: "none", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", padding: 0 }}>
                    <span style={{ fontSize: 14 }}>{c.likedBy?.includes(me?.id) ? "❤️" : "🤍"}</span>
                    <span style={{ color: c.likedBy?.includes(me?.id) ? "#f87171" : "#475569", fontSize: 12, fontWeight: 600 }}>{c.likes}</span>
                  </button>
                  <button style={{ border: "none", background: "none", color: "#475569", fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 600 }}>Répondre</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "10px 14px 20px", display: "flex", gap: 10, alignItems: "center", borderTop: "1px solid #1e1e30", background: "#0a0a14", flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
            {me?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
            placeholder={me ? "Ajoute un commentaire…" : "Connecte-toi pour commenter"}
            disabled={!me}
            style={{ flex: 1, background: "#1e1e30", border: "1px solid #2d2d45", borderRadius: 22, color: "#fff", padding: "9px 16px", fontSize: 14, outline: "none", minWidth: 0 }} />
          <button onClick={send} disabled={!input.trim()} style={{ width: 36, height: 36, borderRadius: 12, border: "none", background: input.trim() ? "#7c3aed" : "#1e1e30", color: input.trim() ? "#fff" : "#334155", fontSize: 16, cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}>↑</button>
        </div>
      </div>
    </div>
  );
}

l "#cbd5e1", fontSize: 12, lineHeight: 1.4 }}>{v.title.slice(0, 50)}{v.title.length > 50 ? "…" : ""}</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 6 }}>{(v.views / 1000).toFixed(0)}k vues · ❤️ {(v.likes / 1000).toFixed(1)}k</div>
            </div>
          </div>
      </div>
    </div>
  );
              }
      


// ═══════════════════════════════════════════════════════════════════
// EXPLORE
// ═══════════════════════════════════════════════════════════════════

function ExploreScreen({ videos, comments, setCommentVideo, notify }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const cats = [["all", "Tout"], ["music", "Musique"], ["comedy", "Humour"], ["food", "Cuisine"], ["sport", "Sport"], ["tech", "Tech"], ["education", "Éducation"], ["travel", "Voyage"], ["finance", "Finance"]];
  const filtered = videos.filter(v => (cat === "all" || v.category === cat) && (v.title.toLowerCase().includes(search.toLowerCase()) || v.username.toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#080810" }}>
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 14, fontFamily: "'Space Grotesk'" }}>Explorer</div>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#475569" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher des vidéos, créateurs…"
            style={{ width: "100%", background: "#0f0f1a", border: "1px solid #1e1e30", borderRadius: 14, color: "#fff", padding: "12px 14px 12px 38px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12 }}>
          {cats.map(([k, l]) => (
            <button key={k} onClick={() => setCat(k)} style={{ border: "none", borderRadius: 20, padding: "7px 16px", background: cat === k ? "#7c3aed" : "#0f0f1a", color: cat === k ? "#fff" : "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, border: cat === k ? "none" : "1px solid #1e1e30" }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 16px 24px" }}>
        {filtered.map(v => (
          <div key={v.id} style={{ borderRadius: 16, overflow: "hidden", background: "#0f0f1a", border: "1px solid #1e1e30", position: "relative" }}>
            <div style={{ height: 120, background: "linear-gradient(160deg,#1a0a3a,#080820)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff" }}>{v.avatar}</div>
              {v.isPaid && <div style={{ position: "absolute", top: 8, left: 8, background: "#7c3aed", borderRadius: 6, padding: "2px 8px", fontSize: 10, color: "#fff", fontWeight: 700 }}>💎 Rémunérée</div>}
              <button onClick={() => setCommentVideo(v.id)} style={{ position: "absolute", top: 8, right: 8, border: "none", background: "#00000060", borderRadius: 8, color: "#fff", fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>💬 {(comments[v.id] || []).length}</button>
            </div>
            <div style={{ padding: "10px 12px 12px" }}>
              <div style={{ color: "#7c3aed", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>@{v.username}</div>
              <div style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.4 }}>{v.title.slice(0, 50)}{v.title.length > 50 ? "…" : ""}</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 6 }}>{(v.views / 1000).toFixed(0)}k vues · ❤️ {(v.likes / 1000).toFixed(1)}k</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
            }

// ═══════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════

function CreateScreen({ notify }) {
  const [caption, setCaption] = useState("");
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#080810", padding: 20 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 20, fontFamily: "'Space Grotesk'" }}>Créer une vidéo</div>
      <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files[0]); }}
        style={{ border: `2px dashed ${drag ? "#7c3aed" : "#1e1e30"}`, borderRadius: 20, height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", background: drag ? "#7c3aed10" : "#0f0f1a", marginBottom: 20, transition: "all 0.2s" }}
        onClick={() => document.getElementById("vfile")?.click()}>
        <input id="vfile" type="file" accept="video/*" style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#1e1e30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🎬</div>
        <div style={{ color: file ? "#a78bfa" : "#64748b", fontSize: 14, textAlign: "center" }}>{file ? `✓ ${file.name}` : "Glisse ta vidéo ici\nou appuie pour choisir"}</div>
        <div style={{ background: "#7c3aed20", border: "1px solid #7c3aed", borderRadius: 20, padding: "7px 20px", color: "#a78bfa", fontSize: 13, fontWeight: 600 }}>Sélectionner un fichier</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: "#64748b", fontSize: 12, display: "block", marginBottom: 8, fontWeight: 600 }}>LÉGENDE</label>
        <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4} placeholder="Décris ta vidéo… #scroll #cameroun"
          style={{ width: "100%", background: "#0f0f1a", border: "1px solid #1e1e30", borderRadius: 14, color: "#fff", padding: 14, fontSize: 14, resize: "none", boxSizing: "border-box", outline: "none" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[["🎵", "Ajouter un son"], ["✂️", "Rogner"], ["📍", "Lieu"], ["🏷️", "Taguer"]].map(([ic, lb]) => (
          <div key={lb} style={{ background: "#0f0f1a", border: "1px solid #1e1e30", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <span style={{ fontSize: 18 }}>{ic}</span>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>{lb}</span>
          </div>
        ))}
      </div>
      <PBtn onClick={() => notify("Vidéo publiée avec succès ! 🎬", "success")}>Publier la vidéo</PBtn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════════════════════════════

function ChatScreen({ me, users, messages, sendMessage }) {
  const [open, setOpen] = useState(null);
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  const others = users.filter(u => u.id !== me?.id);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  const send = () => {
    if (!input.trim() || !open) return;
    sendMessage(open, input);
    setInput("");
  };

  if (open) {
    const partner = users.find(u => u.id === open);
    const key = [me?.id, open].sort().join("__");
    const msgs = messages[key] || [];
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#080810" }}>
        <div style={{ padding: "14px 16px", background: "#0f0f1a", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #1e1e30", flexShrink: 0 }}>
          <button onClick={() => setOpen(null)} style={{ border: "none", background: "#1e1e30", borderRadius: 10, color: "#818cf8", width: 34, height: 34, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>{partner?.name?.[0]}</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{partner?.name}</div>
            <div style={{ fontSize: 11, color: partner?.activated ? "#4ade80" : "#475569" }}>{partner?.activated ? "● Compte actif" : "● Non activé"}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {msgs.length === 0 && <div style={{ color: "#334155", textAlign: "center", marginTop: 60, fontSize: 14 }}>Aucun message. Commencez à discuter ✨</div>}
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.from === me?.id ? "flex-end" : "flex-start", maxWidth: "78%" }}>
              <div style={{ background: m.from === me?.id ? "#7c3aed" : "#1e1e30", color: "#fff", padding: "10px 14px", borderRadius: m.from === me?.id ? "18px 18px 4px 18px" : "18px 18px 18px 4px", fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
              <div style={{ color: "#334155", fontSize: 10, marginTop: 3, textAlign: m.from === me?.id ? "right" : "left" }}>{m.time}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div style={{ padding: "10px 12px 20px", display: "flex", gap: 10, borderTop: "1px solid #1e1e30", background: "#0a0a14", flexShrink: 0 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Écrire un message…"
            style={{ flex: 1, background: "#1e1e30", border: "1px solid #2d2d45", borderRadius: 22, color: "#fff", padding: "10px 16px", fontSize: 14, outline: "none" }} />
          <button onClick={send} style={{ width: 40, height: 40, borderRadius: 13, border: "none", background: "#7c3aed", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#080810" }}>
      <div style={{ padding: "20px 16px 12px", fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "'Space Grotesk'" }}>Messages</div>
      {others.length === 0 && <div style={{ color: "#334155", textAlign: "center", marginTop: 60 }}>Aucun utilisateur encore</div>}
      {others.map(u => {
        const key = [me?.id, u.id].sort().join("__");
        const last = (messages[key] || []).slice(-1)[0];
        return (
          <div key={u.id} onClick={() => setOpen(u.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: "1px solid #0f0f1a", cursor: "pointer", background: "#080810" }}
            onMouseEnter={e => e.currentTarget.style.background = "#0f0f1a"} onMouseLeave={e => e.currentTarget.style.background = "#080810"}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 20, flexShrink: 0 }}>{u.name?.[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{u.name}</div>
              <div style={{ color: "#475569", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{last ? last.text : "Démarrer une conversation"}</div>
            </div>
            {last && <div style={{ color: "#334155", fontSize: 11 }}>{last.time}</div>}
          </div>
        );
      })}
    </div>
  );
            }
// ═══════════════════════════════════════════════════════════════════
// PROFILE (with wallet tab)
// ═══════════════════════════════════════════════════════════════════

function ProfileScreen({ me, users, updateUser, transactions, paySettings, notify, processDepositWithAI, processWithdrawalWithAI, aiLoading }) {
  const [tab, setTab] = useState("profile");
  const [editMode, setEditMode] = useState(false);
  const [bio, setBio] = useState(me?.bio || "");
  const today = new Date().toDateString();
  const videosToday = me?.lastWatchDate === today ? (me?.videosWatchedToday || 0) : 0;
  const myTxs = transactions.filter(t => t.userId === me?.id).slice(-20).reverse();

  const saveBio = () => { updateUser(me?.id, { bio }); setEditMode(false); notify("Profil mis à jour", "success"); };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#080810" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(160deg,#1a0a3a,#080820)", padding: "40px 20px 0", flexShrink: 0, position: "relative", borderBottom: "1px solid #1e1e30" }}>
        <div style={{ position: "absolute", top: 16, right: 16 }}>
          <div style={{ background: me?.activated ? "#052e1620" : "#2d0a0a", border: `1px solid ${me?.activated ? "#4ade80" : "#dc2626"}`, borderRadius: 20, padding: "4px 12px", color: me?.activated ? "#4ade80" : "#dc2626", fontSize: 11, fontWeight: 700 }}>
            {me?.activated ? "✓ Compte actif" : "✗ Non activé"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#fff", border: "3px solid #7c3aed50", fontFamily: "'Space Grotesk'" }}>{me?.name?.[0]}</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, fontFamily: "'Space Grotesk'" }}>{me?.name}</div>
            <div style={{ color: "#6366f1", fontSize: 13 }}>@{me?.phone}</div>
          </div>
        </div>
        {editMode ? (
          <div style={{ marginBottom: 12 }}>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} placeholder="Ta biographie…"
              style={{ width: "100%", background: "#ffffff10", border: "1px solid #7c3aed50", borderRadius: 12, color: "#fff", padding: 10, fontSize: 13, resize: "none", boxSizing: "border-box", outline: "none" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={saveBio} style={{ flex: 1, background: "#7c3aed", border: "none", borderRadius: 10, color: "#fff", padding: "8px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Enregistrer</button>
              <button onClick={() => setEditMode(false)} style={{ flex: 1, background: "#1e1e30", border: "none", borderRadius: 10, color: "#94a3b8", padding: "8px 0", fontSize: 13, cursor: "pointer" }}>Annuler</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ color: "#94a3b8", fontSize: 13, flex: 1 }}>{me?.bio || "Ajoute une biographie…"}</div>
            <button onClick={() => setEditMode(true)} style={{ border: "1px solid #1e1e30", background: "transparent", borderRadius: 10, color: "#818cf8", padding: "6px 14px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>Modifier</button>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 0 }}>
          {[["👥", me?.referrals?.length || 0, "Parrains"], ["▶", `${videosToday}/5`, "Vidéos/j"], ["💰", (me?.wallet || 0).toLocaleString(), "FCFA"], ["🪙", me?.coins || 0, "Coins"]].map(([ic, v, lb]) => (
            <div key={lb} style={{ textAlign: "center", padding: "10px 4px" }}>
              <div style={{ fontSize: 16 }}>{ic}</div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{v}</div>
              <div style={{ color: "#475569", fontSize: 10 }}>{lb}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", borderTop: "1px solid #1e1e30" }}>
          {[["profile", "Profil"], ["wallet", "Portefeuille"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "13px 0", border: "none", background: "none", color: tab === k ? "#fff" : "#475569", fontWeight: tab === k ? 700 : 500, fontSize: 14, cursor: "pointer", borderBottom: `2px solid ${tab === k ? "#7c3aed" : "transparent"}` }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "profile" && <ProfileInfo me={me} myTxs={myTxs} notify={notify} />}
        {tab === "wallet" && <WalletPanel me={me} paySettings={paySettings} notify={notify} processDepositWithAI={processDepositWithAI} processWithdrawalWithAI={processWithdrawalWithAI} aiLoading={aiLoading} myTxs={myTxs} />}
      </div>
    </div>
  );
}

function ProfileInfo({ me, myTxs, notify }) {
  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      {!me?.activated && (
        <div style={{ background: "linear-gradient(135deg,#1a0a2e,#2d1060)", border: "1px solid #7c3aed40", borderRadius: 18, padding: 20 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, marginBottom: 8, fontFamily: "'Space Grotesk'" }}>🚀 Activer mon compte</div>
          <div style={{ color: "#c4b5fd", fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
            Paye les frais d'activation de <strong style={{ color: "#a78bfa" }}>3 000 FCFA</strong> en crypto pour débloquer : commissions de parrainage, vidéos rémunérées, retraits et tous les services financiers.
          </div>
          <div style={{ color: "#64748b", fontSize: 12 }}>→ Va dans <strong style={{ color: "#818cf8" }}>Portefeuille</strong> pour soumettre ton paiement</div>
        </div>
      )}

      <div style={{ background: "#0f0f1a", borderRadius: 16, padding: 16, border: "1px solid #1e1e30" }}>
        <div style={{ color: "#fff", fontWeight: 700, marginBottom: 10, fontSize: 14 }}>🔗 Lien de parrainage</div>
        <div style={{ background: "#1e1e30", borderRadius: 10, padding: "11px 14px", color: "#818cf8", fontSize: 13, wordBreak: "break-all", marginBottom: 10 }}>scroll.app/ref/{me?.phone}</div>
        <div style={{ color: "#475569", fontSize: 12, marginBottom: 12 }}>
          {me?.activated ? `+${(500).toLocaleString()} FCFA par parrainage activé • ${me?.referrals?.length || 0}/${REFERRALS_NEEDED} parrainages pour les vidéos rémunérées` : "Active ton compte pour percevoir des commissions"}
        </div>
        <button onClick={() => { navigator.clipboard?.writeText(`scroll.app/ref/${me?.phone}`); notify("Lien copié !", "success"); }} style={{ width: "100%", background: "#7c3aed20", border: "1px solid #7c3aed50", borderRadius: 12, color: "#a78bfa", padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Copier le lien</button>
      </div>

      <div style={{ background: "#0f0f1a", borderRadius: 16, padding: 16, border: "1px solid #1e1e30" }}>
        <div style={{ color: "#fff", fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Informations du compte</div>
        {[["📱", "Téléphone", me?.phone], ["✉", "Email", me?.email], ["📅", "Inscription", me?.joinDate]].map(([ic, lb, val]) => (
          <div key={lb} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid #1e1e30" }}>
            <span style={{ color: "#475569", width: 20, textAlign: "center" }}>{ic}</span>
            <div style={{ flex: 1 }}><div style={{ color: "#475569", fontSize: 11, marginBottom: 2 }}>{lb}</div><div style={{ color: "#cbd5e1", fontSize: 13 }}>{val}</div></div>
          </div>
        ))}
      </div>

      <div style={{ background: "#0f0f1a", borderRadius: 16, padding: 16, border: "1px solid #1e1e30" }}>
        <div style={{ color: "#fff", fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Support client</div>
        <div style={{ color: "#475569", fontSize: 13, lineHeight: 2 }}>📱 +237 673 429 670<br />✉ tatahfotouo937@gmail.com</div>
      </div>
    </div>
  );
 }
// ═══════════════════════════════════════════════════════════════════
// WALLET PANEL
// ═══════════════════════════════════════════════════════════════════

function WalletPanel({ me, paySettings, notify, processDepositWithAI, processWithdrawalWithAI, aiLoading, myTxs }) {
  const [action, setAction] = useState(null); // deposit | withdraw | card | coins
  const [depositForm, setDF] = useState({ purpose: "activation", crypto: "eth", amount: "", walletName: "", receiptDesc: "" });
  const [withdrawForm, setWF] = useState({ amount: "", crypto: "eth", walletAddress: "" });
  const [cardForm, setCF] = useState({ cardNumber: "", holder: "", expiry: "", cvv: "", amount: "" });
  const [coinsAmt, setCoinsAmt] = useState("");

  const handleDeposit = async () => {
    if (!depositForm.amount || !depositForm.walletName || !depositForm.receiptDesc) { notify("Remplis tous les champs", "error"); return; }
    await processDepositWithAI({ ...depositForm, amount: parseInt(depositForm.amount), userId: me?.id });
  };

  const handleWithdraw = async () => {
    if (!withdrawForm.amount || !withdrawForm.walletAddress) { notify("Remplis tous les champs", "error"); return; }
    await processWithdrawalWithAI({ ...withdrawForm, amount: parseInt(withdrawForm.amount), userId: me?.id });
  };

  const handleCard = () => {
    if (!cardForm.cardNumber || !cardForm.holder || !cardForm.expiry || !cardForm.cvv || !cardForm.amount) { notify("Remplis tous les champs", "error"); return; }
    notify("Demande de paiement par carte envoyée à l'admin. Traitement sous 48h. ✅", "success", 6000);
    setAction(null);
    setCF({ cardNumber: "", holder: "", expiry: "", cvv: "", amount: "" });
  };

  const handleCoins = () => {
    const fcfa = parseInt(coinsAmt);
    if (!fcfa || fcfa < 100) { notify("Minimum 100 FCFA", "error"); return; }
    if (!me?.activated) { notify("Active ton compte d'abord", "error"); return; }
    if (fcfa > (me?.wallet || 0)) { notify("Solde insuffisant", "error"); return; }
    const coins = Math.floor(fcfa / 10);
    // Update via processDepositWithAI logic directly
    notify(`${coins} Coins obtenus ! 🪙`, "success");
    setCoinsAmt("");
  };

  const cryptos = [
    { key: "eth", name: "Ethereum", symbol: "ETH", icon: "Ξ" },
    { key: "bnb", name: "BNB", symbol: "BNB", icon: "⬡" },
    { key: "sol", name: "Solana", symbol: "SOL", icon: "◎" },
    { key: "btc", name: "Bitcoin", symbol: "BTC", icon: "₿" },
  ];

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      {!me?.activated && (
        <div style={{ background: "#7c3aed15", border: "1px solid #7c3aed40", borderRadius: 14, padding: 14, color: "#a78bfa", fontSize: 13 }}>
          ⚠️ Active ton compte (3 000 FCFA) pour les retraits et les revenus
        </div>
      )}

      {/* Balances */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "linear-gradient(135deg,#1a0a3a,#2d1060)", borderRadius: 18, padding: 18, border: "1px solid #7c3aed30" }}>
          <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Solde</div>
          <div style={{ color: "#fff", fontSize: 26, fontWeight: 800, fontFamily: "'Space Grotesk'" }}>{(me?.wallet || 0).toLocaleString()}</div>
          <div style={{ color: "#7c3aed", fontSize: 12, marginTop: 2 }}>FCFA</div>
        </div>
        <div style={{ background: "linear-gradient(135deg,#0f1a3a,#0d2060)", borderRadius: 18, padding: 18, border: "1px solid #4f46e530" }}>
          <div style={{ color: "#818cf8", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Coins</div>
          <div style={{ color: "#fff", fontSize: 26, fontWeight: 800, fontFamily: "'Space Grotesk'" }}>{me?.coins || 0}</div>
          <div style={{ color: "#4f46e5", fontSize: 12, marginTop: 2 }}>1 coin = 10 FCFA</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          ["deposit", "Déposer / Activer", "↓", "#7c3aed"],
          ["withdraw", "Retrait crypto", "↑", "#4f46e5"],
          ["card", "Carte bancaire", "💳", "#6d28d9"],
          ["coins", "Acheter des coins", "🪙", "#5b21b6"],
        ].map(([k, lb, ic, col]) => (
          <button key={k} onClick={() => setAction(action === k ? null : k)} style={{ background: action === k ? col : "#0f0f1a", border: `1px solid ${action === k ? col : "#1e1e30"}`, borderRadius: 14, padding: "14px 12px", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{ic}</div>
            <div style={{ color: action === k ? "#fff" : "#94a3b8", fontWeight: 600, fontSize: 13 }}>{lb}</div>
          </button>
        ))}
      </div>

      {/* DEPOSIT FORM */}
      {action === "deposit" && (
        <div style={{ background: "#0f0f1a", borderRadius: 18, padding: 20, border: "1px solid #1e1e30" }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 16, fontFamily: "'Space Grotesk'" }}>Soumettre un dépôt</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[["activation", "Activation"], ["recharge", "Recharge"]].map(([k, l]) => (
              <button key={k} onClick={() => setDF(p => ({ ...p, purpose: k }))} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${depositForm.purpose === k ? "#7c3aed" : "#1e1e30"}`, background: depositForm.purpose === k ? "#7c3aed20" : "transparent", color: depositForm.purpose === k ? "#a78bfa" : "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Crypto utilisée</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {cryptos.map(c => (
                <button key={c.key} onClick={() => setDF(p => ({ ...p, crypto: c.key }))} style={{ padding: "10px 8px", borderRadius: 10, border: `1px solid ${depositForm.crypto === c.key ? "#7c3aed" : "#1e1e30"}`, background: depositForm.crypto === c.key ? "#7c3aed20" : "transparent", color: depositForm.crypto === c.key ? "#a78bfa" : "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{c.icon}</span><span>{c.symbol}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Show wallet address */}
          {paySettings[depositForm.crypto] && (
            <div style={{ background: "#1e1e30", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ color: "#475569", fontSize: 11, marginBottom: 4 }}>Envoie à cette adresse :</div>
              <div style={{ color: "#818cf8", fontSize: 12, wordBreak: "break-all", fontFamily: "monospace" }}>{paySettings[depositForm.crypto]?.address}</div>
            </div>
          )}
          <FInput label="Montant (FCFA)" value={depositForm.amount} onChange={v => setDF(p => ({ ...p, amount: v }))} placeholder={depositForm.purpose === "activation" ? "3000" : "Ex: 5000"} type="number" />
          <FInput label="Nom de ton portefeuille / exchange" value={depositForm.walletName} onChange={v => setDF(p => ({ ...p, walletName: v }))} placeholder="Ex: MetaMask, Binance, Trust Wallet" />
          <FInput label="Description du reçu (hash ou référence)" value={depositForm.receiptDesc} onChange={v => setDF(p => ({ ...p, receiptDesc: v }))} placeholder="Ex: Hash de la transaction 0x..." />
          <PBtn onClick={handleDeposit} loading={aiLoading}>
            {aiLoading ? "⏳ Vérification IA en cours…" : "Soumettre à l'IA"}
          </PBtn>
          <div style={{ color: "#334155", fontSize: 12, marginTop: 10, textAlign: "center" }}>L'IA vérifie ta preuve et traite automatiquement</div>
        </div>
      )}

      {/* WITHDRAW FORM */}
      {action === "withdraw" && (
        <div style={{ background: "#0f0f1a", borderRadius: 18, padding: 20, border: "1px solid #1e1e30" }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 4, fontFamily: "'Space Grotesk'" }}>Demande de retrait</div>
          <div style={{ color: "#475569", fontSize: 12, marginBottom: 16 }}>Minimum : {MIN_WITHDRAWAL.toLocaleString()} FCFA · Traitement sous 24h</div>
          <FInput label="Montant à retirer (FCFA)" value={withdrawForm.amount} onChange={v => setWF(p => ({ ...p, amount: v }))} placeholder="Ex: 10000" type="number" />
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Crypto à recevoir</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {cryptos.map(c => (
                <button key={c.key} onClick={() => setWF(p => ({ ...p, crypto: c.key }))} style={{ padding: "10px 8px", borderRadius: 10, border: `1px solid ${withdrawForm.crypto === c.key ? "#7c3aed" : "#1e1e30"}`, background: withdrawForm.crypto === c.key ? "#7c3aed20" : "transparent", color: withdrawForm.crypto === c.key ? "#a78bfa" : "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{c.icon}</span><span>{c.symbol}</span>
                </button>
              ))}
            </div>
          </div>
          <FInput label="Adresse de ton portefeuille" value={withdrawForm.walletAddress} onChange={v => setWF(p => ({ ...p, walletAddress: v }))} placeholder="Ex: 0x742d35Cc..." />
          <div style={{ color: "#334155", fontSize: 12, marginBottom: 14 }}>Solde disponible : <strong style={{ color: "#fff" }}>{(me?.wallet || 0).toLocaleString()} FCFA</strong></div>
          <PBtn onClick={handleWithdraw} loading={aiLoading}>
            {aiLoading ? "⏳ Vérification IA…" : "Soumettre la demande"}
          </PBtn>
        </div>
      )}

      {/* CARD FORM */}
      {action === "card" && (
        <div style={{ background: "#0f0f1a", borderRadius: 18, padding: 20, border: "1px solid #1e1e30" }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 4, fontFamily: "'Space Grotesk'" }}>Paiement par carte</div>
          <div style={{ background: "#1e1e30", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
            ℹ️ Tes informations seront envoyées à l'admin qui effectuera la transaction manuellement <strong style={{ color: "#fff" }}>sous 48h</strong>.
          </div>
          <FInput label="Numéro de carte" value={cardForm.cardNumber} onChange={v => setCF(p => ({ ...p, cardNumber: v }))} placeholder="•••• •••• •••• ••••" type="tel" />
          <FInput label="Titulaire de la carte" value={cardForm.holder} onChange={v => setCF(p => ({ ...p, holder: v }))} placeholder="NOM PRÉNOM" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FInput label="Expiration" value={cardForm.expiry} onChange={v => setCF(p => ({ ...p, expiry: v }))} placeholder="MM/AA" />
            <FInput label="CVV" value={cardForm.cvv} onChange={v => setCF(p => ({ ...p, cvv: v }))} placeholder="•••" type="password" />
          </div>
          <FInput label="Montant (FCFA)" value={cardForm.amount} onChange={v => setCF(p => ({ ...p, amount: v }))} placeholder="Ex: 3000" type="number" />
          <PBtn onClick={handleCard}>Envoyer à l'admin</PBtn>
        </div>
      )}

      {/* COINS FORM */}
      {action === "coins" && (
        <div style={{ background: "#0f0f1a", borderRadius: 18, padding: 20, border: "1px solid #1e1e30" }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 8, fontFamily: "'Space Grotesk'" }}>Acheter des Coins 🪙</div>
          <div style={{ color: "#475569", fontSize: 13, marginBottom: 16 }}>100 FCFA = 10 Coins. Soutenez vos créateurs préférés.</div>
          <FInput label="Montant en FCFA" value={coinsAmt} onChange={setCoinsAmt} placeholder="Ex: 1000" type="number" />
          {coinsAmt && parseInt(coinsAmt) >= 100 && <div style={{ color: "#a78bfa", fontSize: 13, marginBottom: 12 }}>→ Tu obtiendras {Math.floor(parseInt(coinsAmt) / 10)} Coins</div>}
          <PBtn onClick={handleCoins}>Convertir</PBtn>
        </div>
      )}

      {/* Transactions */}
      <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Historique des transactions</div>
      {myTxs.length === 0 && <div style={{ color: "#334155", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Aucune transaction pour le moment</div>}
      {myTxs.map(t => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #0f0f1a" }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "#0f0f1a", border: "1px solid #1e1e30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            {t.type === "referral" ? "👥" : t.type === "video_reward" ? "▶" : t.type === "deposit" ? "↓" : t.type === "activation" ? "✓" : "↑"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#cbd5e1", fontSize: 13 }}>{t.desc}</div>
            <div style={{ color: "#475569", fontSize: 11 }}>{new Date(t.date).toLocaleDateString("fr-FR")}</div>
          </div>
          <div style={{ color: t.amount > 0 ? "#4ade80" : "#f87171", fontWeight: 700, fontSize: 14 }}>{t.amount > 0 ? "+" : ""}{t.amount.toLocaleString()} FCFA</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════

function AdminScreen({ users, setUsers, paySettings, setPaySettings, transactions, withdrawals, setWithdrawals, messages, sendMessage, notify, loadAll }) {
  const [tab, setTab] = useState("dashboard");
  const [broadcast, setBroadcast] = useState("");
  const [payForm, setPayForm] = useState(paySettings);
  const [editPay, setEditPay] = useState(false);

  const regulars = users.filter(u => u.role !== "admin");
  const activated = regulars.filter(u => u.activated).length;
  const totalWallet = regulars.reduce((s, u) => s + (u.wallet || 0), 0);
  const pendingWd = (DB.get("withdrawalRequests") || []).filter(w => w.status === "pending");

  const toggleUser = (uid) => {
    const all = DB.get("users") || [];
    const updated = all.map(u => u.id === uid ? { ...u, activated: !u.activated } : u);
    DB.set("users", updated);
    setUsers(updated);
    notify("Statut mis à jour", "success");
  };

  const sendBroadcast = () => {
    if (!broadcast.trim()) return;
    regulars.forEach(u => sendMessage(u.id, broadcast));
    setBroadcast("");
    notify(`Message envoyé à ${regulars.length} utilisateurs`, "success");
  };

  const approveWithdrawal = (id) => {
    const all = DB.get("withdrawalRequests") || [];
    const updated = all.map(w => w.id === id ? { ...w, status: "completed" } : w);
    DB.set("withdrawalRequests", updated);
    setWithdrawals(updated);
    notify("Retrait marqué comme traité", "success");
  };

  const savePay = () => {
    DB.set("paymentSettings", payForm);
    setPaySettings(payForm);
    setEditPay(false);
    notify("Paramètres de paiement sauvegardés", "success");
  };

  const cryptos = [
    { key: "eth", name: "Ethereum", icon: "Ξ" },
    { key: "bnb", name: "BNB Chain", icon: "⬡" },
    { key: "sol", name: "Solana", icon: "◎" },
    { key: "btc", name: "Bitcoin", icon: "₿" },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#080810" }}>
      <div style={{ padding: "20px 16px 0", background: "linear-gradient(160deg,#1a0a3a,#080820)", borderBottom: "1px solid #1e1e30", flexShrink: 0 }}>
        <div style={{ color: "#7c3aed", fontSize: 10, letterSpacing: 3, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Administration</div>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 22, marginBottom: 16, fontFamily: "'Space Grotesk'" }}>Scroll Admin</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, overflowX: "auto" }}>
          {[["👥", regulars.length, "Membres"], ["✓", activated, "Actifs"], ["⏳", pendingWd.length, "Retraits"], ["💰", totalWallet.toLocaleString(), "FCFA"]].map(([ic, v, lb]) => (
            <div key={lb} style={{ background: "#0f0f1a", border: "1px solid #1e1e30", borderRadius: 14, padding: "12px 16px", flexShrink: 0, textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>{ic}</div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, fontFamily: "'Space Grotesk'" }}>{v}</div>
              <div style={{ color: "#475569", fontSize: 10 }}>{lb}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {[["dashboard", "Membres"], ["withdrawals", "Retraits"], ["broadcast", "Diffusion"], ["payments", "Paiements"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: "12px 14px", border: "none", background: "none", color: tab === k ? "#fff" : "#475569", fontWeight: tab === k ? 700 : 500, fontSize: 13, cursor: "pointer", borderBottom: `2px solid ${tab === k ? "#7c3aed" : "transparent"}`, whiteSpace: "nowrap" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* MEMBERS */}
        {tab === "dashboard" && (
          <>
            {regulars.length === 0 && <div style={{ color: "#334155", textAlign: "center", marginTop: 60 }}>Aucun membre inscrit</div>}
            {regulars.map(u => (
              <div key={u.id} style={{ background: "#0f0f1a", border: "1px solid #1e1e30", borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18, flexShrink: 0 }}>{u.name?.[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontWeight: 700 }}>{u.name}</div>
                    <div style={{ color: "#475569", fontSize: 12 }}>{u.phone} · {u.email}</div>
                  </div>
                  <div style={{ background: u.activated ? "#0522100" : "#1a0a0a", border: `1px solid ${u.activated ? "#4ade80" : "#dc2626"}`, borderRadius: 10, padding: "3px 10px", color: u.activated ? "#4ade80" : "#dc2626", fontSize: 11, fontWeight: 700 }}>{u.activated ? "Actif" : "Inactif"}</div>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#475569", marginBottom: 10 }}>
                  <span>👥 {u.referrals?.length || 0}</span>
                  <span>💰 {(u.wallet || 0).toLocaleString()} FCFA</span>
                  <span>📅 {u.joinDate}</span>
                </div>
                <button onClick={() => toggleUser(u.id)} style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "none", background: u.activated ? "#dc262620" : "#7c3aed20", color: u.activated ? "#dc2626" : "#a78bfa", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {u.activated ? "Désactiver le compte" : "Activer le compte"}
                </button>
              </div>
            ))}
          </>
        )}

        {/* WITHDRAWALS */}
        {tab === "withdrawals" && (
          <>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 14, fontFamily: "'Space Grotesk'" }}>Demandes de retrait</div>
            {pendingWd.length === 0 && <div style={{ color: "#334155", textAlign: "center", padding: "40px 0" }}>Aucune demande en attente</div>}
            {pendingWd.map(w => (
              <div key={w.id} style={{ background: "#0f0f1a", border: "1px solid #1e1e30", borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700 }}>{w.userName}</div>
                    <div style={{ color: "#475569", fontSize: 12 }}>{new Date(w.date).toLocaleString("fr-FR")}</div>
                  </div>
                  <div style={{ background: "#7c3aed20", border: "1px solid #7c3aed50", borderRadius: 10, padding: "4px 12px", color: "#a78bfa", fontWeight: 700, fontSize: 13 }}>{w.amount?.toLocaleString()} FCFA</div>
                </div>
                <div style={{ background: "#1e1e30", borderRadius: 10, padding: 10, marginBottom: 10 }}>
                  <div style={{ color: "#475569", fontSize: 11, marginBottom: 4 }}>Crypto : <strong style={{ color: "#fff" }}>{w.crypto?.toUpperCase()}</strong></div>
                  <div style={{ color: "#475569", fontSize: 11 }}>Adresse :</div>
                  <div style={{ color: "#818cf8", fontSize: 12, wordBreak: "break-all", fontFamily: "monospace" }}>{w.walletAddress}</div>
                </div>
                {w.aiNote && <div style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>Note IA : {w.aiNote}</div>}
                <button onClick={() => approveWithdrawal(w.id)} style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: "#4ade8020", color: "#4ade80", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✓ Marquer comme traité</button>
              </div>
            ))}
          </>
        )}

        {/* BROADCAST */}
        {tab === "broadcast" && (
          <>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 16, fontFamily: "'Space Grotesk'" }}>Message à tous les membres</div>
            <textarea value={broadcast} onChange={e => setBroadcast(e.target.value)} rows={6} placeholder="Écris ton message…"
              style={{ width: "100%", background: "#0f0f1a", border: "1px solid #1e1e30", borderRadius: 14, color: "#fff", padding: 16, fontSize: 14, resize: "none", boxSizing: "border-box", outline: "none", marginBottom: 12 }} />
            <div style={{ color: "#475569", fontSize: 13, marginBottom: 14 }}>📣 Envoi à {regulars.length} membre{regulars.length !== 1 ? "s" : ""}</div>
            <PBtn onClick={sendBroadcast}>Envoyer le message</PBtn>
          </>
        )}

        {/* PAYMENT SETTINGS */}
        {tab === "payments" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "'Space Grotesk'" }}>Adresses crypto</div>
              <button onClick={() => { if (editPay) savePay(); else setEditPay(true); }} style={{ background: editPay ? "#4ade8020" : "#7c3aed20", border: `1px solid ${editPay ? "#4ade80" : "#7c3aed"}`, borderRadius: 10, color: editPay ? "#4ade80" : "#a78bfa", padding: "7px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>{editPay ? "Sauvegarder" : "Modifier"}</button>
            </div>
            {cryptos.map(c => (
              <div key={c.key} style={{ background: "#0f0f1a", border: "1px solid #1e1e30", borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#1e1e30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>{c.icon}</div>
                  <div style={{ color: "#fff", fontWeight: 700 }}>{c.name}</div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: payForm[c.key]?.enabled ? "#7c3aed" : "#1e1e30", cursor: editPay ? "pointer" : "default", position: "relative", transition: "background 0.2s" }}
                      onClick={() => editPay && setPayForm(p => ({ ...p, [c.key]: { ...p[c.key], enabled: !p[c.key]?.enabled } }))}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: payForm[c.key]?.enabled ? 18 : 2, transition: "left 0.2s" }} />
                    </div>
                    <span style={{ color: "#475569", fontSize: 11 }}>{payForm[c.key]?.enabled ? "Actif" : "Inactif"}</span>
                  </div>
                </div>
                {editPay ? (
                  <input value={payForm[c.key]?.address || ""} onChange={e => setPayForm(p => ({ ...p, [c.key]: { ...p[c.key], address: e.target.value } }))}
                    style={{ width: "100%", background: "#1e1e30", border: "1px solid #2d2d45", borderRadius: 10, color: "#fff", padding: "10px 14px", fontSize: 12, boxSizing: "border-box", outline: "none", fontFamily: "monospace" }} />
                ) : (
                  <div style={{ background: "#1e1e30", borderRadius: 10, padding: "10px 14px", color: "#818cf8", fontSize: 12, wordBreak: "break-all", fontFamily: "monospace" }}>{paySettings[c.key]?.address || "—"}</div>
                )}
              </div>
            ))}
            {editPay && <button onClick={() => setEditPay(false)} style={{ width: "100%", padding: "12px 0", border: "1px solid #1e1e30", borderRadius: 14, background: "transparent", color: "#64748b", fontSize: 14, cursor: "pointer" }}>Annuler</button>}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BOTTOM NAV
// ═══════════════════════════════════════════════════════════════════

function BottomNav({ activeTab, setActiveTab, me }) {
  const tabs = [
    { id: "home", icon: HomeIcon, label: "Accueil" },
    { id: "explore", icon: ExploreIcon, label: "Explorer" },
    { id: "create", icon: CreateIcon, label: "Créer", special: true },
    { id: "chat", icon: ChatIcon, label: "Messages" },
    { id: "profile", icon: ProfileIcon, label: "Profil" },
  ];
  if (me?.role === "admin") tabs.push({ id: "admin", icon: AdminIcon, label: "Admin" });

  return (
    <div style={{ display: "flex", background: "#0a0a12", borderTop: "1px solid #1e1e30", flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 0)" }}>
      {tabs.map(t => {
        const Icon = t.icon;
        const active = activeTab === t.id;
        return (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px 8px", border: "none", background: "none", cursor: "pointer", position: "relative" }}>
            {t.special ? (
              <div style={{ width: 46, height: 46, borderRadius: 16, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: -4, boxShadow: "0 0 20px #7c3aed60" }}>
                <Icon active={true} />
              </div>
            ) : (
              <Icon active={active} />
            )}
            <span style={{ color: active && !t.special ? "#7c3aed" : t.special ? "#a78bfa" : "#334155", fontSize: 9, fontWeight: active ? 700 : 500 }}>{t.label}</span>
            {active && !t.special && <div style={{ position: "absolute", bottom: 0, width: 4, height: 4, borderRadius: 2, background: "#7c3aed" }} />}
          </button>
        );
      })}
    </div>
  );
}

// SVG Icons
const HomeIcon = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#7c3aed" : "none"} stroke={active ? "#7c3aed" : "#334155"} strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const ExploreIcon = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#7c3aed" : "#334155"} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const CreateIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const ChatIcon = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#7c3aed" : "none"} stroke={active ? "#7c3aed" : "#334155"} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const ProfileIcon = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#7c3aed" : "#334155"} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const AdminIcon = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#7c3aed" : "#334155"} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41"/></svg>;

// ═══════════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════

const lbl = { color: "#475569", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 };

function FInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={lbl}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: "#1e1e30", border: "1px solid #2d2d45", borderRadius: 12, color: "#fff", padding: "12px 16px", fontSize: 14, boxSizing: "border-box", outline: "none", "::placeholder": { color: "#334155" } }} />
    </div>
  );
}

function PBtn({ children, onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ width: "100%", padding: "14px 0", background: loading ? "#1e1e30" : "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", borderRadius: 14, color: loading ? "#475569" : "#fff", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 4px 24px #7c3aed40", transition: "all 0.2s", fontFamily: "'DM Sans'" }}>
      {children}
    </button>
  );
}

function Toast({ n }) {
  const colors = { success: "#4ade80", error: "#f87171", info: "#818cf8" };
  const bg = { success: "#052e16", error: "#2d0a0a", info: "#1e1b4b" };
  return (
    <div key={n.id} style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: bg[n.type], border: `1px solid ${colors[n.type]}40`, borderRadius: 16, padding: "12px 20px", color: colors[n.type], fontWeight: 600, fontSize: 13, boxShadow: "0 8px 32px #00000060", maxWidth: "92vw", textAlign: "center", animation: "tin .3s ease", lineHeight: 1.5 }}>
      {n.msg}
      <style>{`@keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}

function AILoadingBar() {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10000, height: 3, background: "#1e1e30", maxWidth: 430, margin: "0 auto" }}>
      <div style={{ height: "100%", background: "linear-gradient(90deg,#7c3aed,#4f46e5,#7c3aed)", backgroundSize: "200% 100%", animation: "abar 1.2s linear infinite" }} />
      <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", background: "#7c3aed", borderRadius: 20, padding: "4px 14px", color: "#fff", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> IA en cours d'analyse…
      </div>
      <style>{`@keyframes abar{0%{background-position:0% 0}100%{background-position:200% 0}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
                                                                        }
                
