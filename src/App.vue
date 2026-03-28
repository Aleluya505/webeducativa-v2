<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { supabase } from './lib/supabase';

// --- 1. LÓGICA DE ESTADO ---
const isMenuOpen = ref(false);
const selection = ref({ year: '4º', shift: 'TM' });
const classroomCode = ref('---');
const materialsList = ref([]);
const materiaNombre = ref('Cargando...');

// --- 2. LÓGICA DE NOTICIAS (API) ---
const news = ref([]);
const currentSlide = ref(0);
let slideInterval = null;

const fetchNews = async () => {
  const API_KEY = import.meta.env.VITE_GNEWS_KEY || 'TU_API_KEY_AQUI';
  const queries = [
    '(tecnología OR "inteligencia artificial" OR robótica OR educación digital OR videojuegos) AND ("América Latina" OR "Latinoamérica" OR Argentina OR México OR Colombia OR Chile OR Brasil)',
    'tecnología OR "inteligencia artificial" OR robótica OR innovación OR educación digital',
    'tecnologia inteligencia artificial'
  ];
  const mapArticles = (articles) =>
    articles.map((art, index) => ({
      id: index, title: art.title, desc: art.description, link: art.url, img: art.image
    }));
  try {
    for (const query of queries) {
      const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=es&max=6&sortby=publishedAt&apikey=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.articles && data.articles.length > 0) {
        news.value = mapArticles(data.articles);
        return;
      }
      console.warn(`Query sin resultados: "${query}"`);
    }
    const backupUrl = `https://gnews.io/api/v4/top-headlines?category=technology&lang=es&max=6&apikey=${API_KEY}`;
    const resBackup = await fetch(backupUrl);
    const dataBackup = await resBackup.json();
    if (dataBackup.articles?.length > 0) news.value = mapArticles(dataBackup.articles);
  } catch (err) { console.error('Error al traer noticias:', err); }
};

// --- 3. LÓGICA DE SUPABASE ---
const fetchData = async () => {
  try {
    const { data: curso } = await supabase
      .from('cursos').select('*')
      .eq('anio', selection.value.year)
      .eq('turno', selection.value.shift)
      .single();
    if (curso) {
      materiaNombre.value = curso.nombre_materia;
      const { data: recursos } = await supabase
        .from('recursos').select('*').eq('curso_id', curso.id);
      if (recursos) {
        const classroom = recursos.find(r => r.tipo === 'classroom');
        classroomCode.value = classroom ? classroom.valor_extra : '---';
        materialsList.value = recursos.filter(r => r.tipo !== 'classroom');
      }
    }
  } catch (err) { console.error('Error Supabase:', err); }
};

// --- 4. FUNCIONES DE UI ---
const toggleMenu = () => { isMenuOpen.value = !isMenuOpen.value; };
const selectCourse = (year, shift) => {
  selection.value = { year, shift };
  isMenuOpen.value = false;
};
const nextSlide = () => { currentSlide.value = (currentSlide.value + 1) % news.value.length; };
const prevSlide = () => { currentSlide.value = (currentSlide.value - 1 + news.value.length) % news.value.length; };

// --- 5. LÓGICA DE EXTRAS / TABS ---
const activeTab = ref('juegos');

// Trivia con IA
const triviaState = ref('idle'); // idle | loading | playing
const triviaQuestion = ref(null);
const triviaScore = ref(0);
const triviaTotal = ref(0);
const selectedAnswer = ref(null);
const isCorrect = ref(null);

const fetchTriviaQuestion = async () => {
  triviaState.value = 'loading';
  selectedAnswer.value = null;
  isCorrect.value = null;

  try {
    // Llama a tu función serverless, no directamente a Anthropic
    const response = await fetch('/api/trivia', { method: 'POST' });

    if (!response.ok) throw new Error('Error en la API');

    const data = await response.json();
    triviaQuestion.value = data;
    triviaState.value = 'playing';
  } catch (err) {
    console.error('Error trivia:', err);
    triviaState.value = 'idle';
  }
};

const answerTrivia = (index) => {
  if (selectedAnswer.value !== null) return;
  selectedAnswer.value = index;
  isCorrect.value = index === triviaQuestion.value.correcta;
  if (isCorrect.value) triviaScore.value++;
  triviaTotal.value++;
};

const nextQuestion = () => fetchTriviaQuestion();
const resetTrivia = () => {
  triviaState.value = 'idle';
  triviaScore.value = 0;
  triviaTotal.value = 0;
  triviaQuestion.value = null;
};

// Links externos
const gameLinks = ref([
  { name: '🎮 Kahoot', url: 'https://kahoot.it', desc: 'Ingresá con el código de tu profe' },
  { name: '📝 Quizizz', url: 'https://quizizz.com', desc: 'Trivia y cuestionarios interactivos' },
  { name: '🧩 Scratch', url: 'https://scratch.mit.edu', desc: 'Programación visual y creativa' },
]);

// Videos — reemplazá embedId y driveUrl con los reales
const videos = ref([
  {
    id: 'v1', title: '¿Qué es la Inteligencia Artificial?',
    type: 'youtube', embedId: 'idMBeCCCzs?si=Ryf5ZogPw6zdI3F3',
    desc: 'Introducción a la IA para secundaria'
  },
  {
    id: 'v2', title: 'Cómo funciona internet',
    type: 'youtube', embedId: 'TNQsmPf24go',
    desc: 'Explicación visual paso a paso'
  },
  {
    id: 'v3', title: 'Tutorial Drive compartido',
    type: 'drive', driveUrl: 'https://drive.google.com/file/d/TU_ID_AQUI/preview',
    desc: 'Material propio del curso'
  },
]);

watch(selection, () => fetchData(), { deep: true });

onMounted(() => {
  fetchData();
  fetchNews();
  slideInterval = setInterval(nextSlide, 7000);
});
onUnmounted(() => { if (slideInterval) clearInterval(slideInterval); });
</script>

<template>
  <div class="site-container">

    <!-- NAVBAR -->
    <nav class="navbar">
      <div class="nav-header">
        <div class="logo-group zoom-hover">
          <span class="logo-icon">🚀</span>
          <span class="brand">WebEduc</span>
        </div>
        <button class="menu-toggle" @click="toggleMenu">{{ isMenuOpen ? '✕' : '☰' }}</button>
      </div>
      <div :class="['nav-links', { 'is-open': isMenuOpen }]">
        <a href="#" class="nav-item zoom-hover">Inicio</a>
        <a href="#materiales" class="nav-item zoom-hover">Materiales</a>
        <a href="#extras" class="nav-item zoom-hover extra-link">Extras</a>
      </div>
    </nav>

    <!-- WELCOME -->
    <div class="welcome-box">
      <h1>¡Bienvenido/a a Educación Tecnológica y Tecnologías de la Información!</h1>
      <p>Seleccioná tu curso para acceder a los materiales.</p>
    </div>

    <!-- CAROUSEL -->
    <header class="hero-carousel" v-if="news.length > 0">
      <span class="badge-new">NOVEDADES ⚡</span>
      <Transition name="slide-fade" mode="out-in">
        <div class="carousel-content" :key="currentSlide">
          <div class="carousel-info">
            <h2 class="slide-title">{{ news[currentSlide].title }}</h2>
            <p class="slide-desc">{{ news[currentSlide].desc }}</p>
            <a :href="news[currentSlide].link" target="_blank" class="news-link">Leer noticia ➡️</a>
          </div>
          <div class="carousel-image" v-if="news[currentSlide].img">
            <img :src="news[currentSlide].img" class="news-img" :alt="news[currentSlide].title">
          </div>
          <div class="carousel-image no-img" v-else><span>📰</span></div>
        </div>
      </Transition>
      <div class="carousel-controls">
        <button class="carousel-arrow" @click="prevSlide">‹</button>
        <div class="carousel-dots">
          <span v-for="(n, i) in news" :key="i" :class="['dot', { active: currentSlide === i }]" @click="currentSlide = i"></span>
        </div>
        <button class="carousel-arrow" @click="nextSlide">›</button>
      </div>
    </header>

    <!-- CURSOS -->
    <section class="section">
      <h2 class="section-title">Nuestros Cursos</h2>
      <div class="courses-grid">
        <div v-for="y in ['1º', '2º', '3º', '4º', '5º']" :key="y" :class="['course-card', { featured: selection.year === y }]">
          <div :class="['card-header', { highlight: selection.year === y }]">{{ y }}</div>
          <div class="card-body">
            <strong class="bold-subject">{{ (y === '1º' || y === '2º') ? 'Educación Tecnológica' : 'Tec. de la Info' }}</strong>
            <div class="shift-selector-centered">
              <button v-if="y !== '5º'" :class="['s-btn', {active: selection.year === y && selection.shift === 'TM'}]" @click="selectCourse(y, 'TM')">TM</button>
              <button v-if="y !== '1º' && y !== '2º'" :class="['s-btn', {active: selection.year === y && selection.shift === 'TT'}]" @click="selectCourse(y, 'TT')">TT</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- MATERIALES -->
    <div id="materiales" class="info-split">
      <div class="panel-box material-panel">
        <h3 class="panel-title">📄 Materiales {{ selection.year }} ({{ selection.shift }})</h3>
        <div class="file-list">
          <div v-if="materialsList.length === 0" class="file-empty">Aún no hay materiales cargados.</div>
          <a v-for="item in materialsList" :key="item.id" :href="item.url" target="_blank" class="file-link">
            <div class="file-item">
              <span class="file-icon">{{ item.tipo === 'pdf' ? '📄' : '🔗' }}</span>
              <span>{{ item.titulo }}</span>
            </div>
          </a>
        </div>
      </div>
      <div class="panel-box classroom-panel">
        <h3 class="panel-title">🔑 Classroom</h3>
        <div class="code-display">{{ classroomCode }}</div>
      </div>
    </div>

    <!-- ===================== EXTRAS CON TABS ===================== -->
    <section id="extras" class="extras-section">
      <h1 class="section-title"> 🎯Extras </h1>

      <div class="tabs-bar">
        <button :class="['tab-btn', { active: activeTab === 'juegos' }]" @click="activeTab = 'juegos'">🎮 Juegos</button>
        <button :class="['tab-btn', { active: activeTab === 'videos' }]" @click="activeTab = 'videos'">🎬 Videos</button>
        <button :class="['tab-btn', { active: activeTab === 'links'  }]" @click="activeTab = 'links'">🔗 Links útiles</button>
      </div>

      <!-- TAB: JUEGOS -->
      <div v-if="activeTab === 'juegos'" class="tab-content">

        <!-- Trivia IA -->
        <div class="game-card trivia-card">
          <h3>🤖 Trivia con IA</h3>
          <p class="game-desc">Preguntas generadas por inteligencia artificial sobre tecnología e informática.</p>

          <div v-if="triviaState === 'idle'" class="trivia-idle">
            <button class="play-btn" @click="fetchTriviaQuestion">¡Jugar! 🚀</button>
          </div>

          <div v-if="triviaState === 'loading'" class="trivia-loading">
            <span>⏳</span> Generando pregunta...
          </div>

          <div v-if="triviaState === 'playing' && triviaQuestion" class="trivia-playing">
            <div class="trivia-score">Puntaje: {{ triviaScore }} / {{ triviaTotal }}</div>
            <p class="trivia-q">{{ triviaQuestion.pregunta }}</p>
            <div class="trivia-options">
              <button
                v-for="(op, i) in triviaQuestion.opciones" :key="i"
                :class="['option-btn', {
                  correct:  selectedAnswer !== null && i === triviaQuestion.correcta,
                  wrong:    selectedAnswer === i && !isCorrect,
                  disabled: selectedAnswer !== null
                }]"
                @click="answerTrivia(i)"
              >{{ op }}</button>
            </div>
            <div v-if="selectedAnswer !== null" class="trivia-feedback">
              <p :class="isCorrect ? 'feedback-ok' : 'feedback-err'">
                {{ isCorrect ? '✅ ¡Correcto!' : '❌ Incorrecto' }}
              </p>
              <p class="trivia-exp">{{ triviaQuestion.explicacion }}</p>
              <div class="trivia-actions">
                <button class="play-btn small" @click="nextQuestion">Siguiente ➡️</button>
                <button class="reset-btn" @click="resetTrivia">Reiniciar</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Juegos externos -->
        <div class="game-card">
          <h3>🌐 Juegos externos</h3>
          <div class="game-links-grid">
            <a v-for="g in gameLinks" :key="g.name" :href="g.url" target="_blank" class="game-ext-link">
              <span class="ext-name">{{ g.name }}</span>
              <span class="ext-desc">{{ g.desc }}</span>
            </a>
          </div>
        </div>

      </div>

      <!-- TAB: VIDEOS -->
      <div v-if="activeTab === 'videos'" class="tab-content">
        <div class="videos-grid">
          <div v-for="v in videos" :key="v.id" class="video-card">
            <div class="video-embed">
        <iframe
  v-if="v.type === 'youtube'"
  :src="`https://www.youtube.com/embed/${v.embedId}`"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
></iframe>
              <iframe
                v-else-if="v.type === 'drive'"
                :src="v.driveUrl"
                frameborder="0"
                allowfullscreen
              ></iframe>
            </div>
            <div class="video-info">
              <strong>{{ v.title }}</strong>
              <p>{{ v.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: LINKS ÚTILES -->
      <div v-if="activeTab === 'links'" class="tab-content">
        <div class="links-grid">
          <div class="extra-card link-special">
            <h4>🔗 Acceso Figaro</h4>
            <p class="game-desc">Sistema de gestión institucional del colegio.</p>
            <a href="https://figaronline.com/login/" target="_blank" class="figaro-btn">Acceso Figaro 🔐</a>
          </div>
          <!-- Podés agregar más cards de links acá con la misma estructura -->
        </div>
      </div>

    </section>
    <!-- ===================== FIN EXTRAS ===================== -->

    <footer class="footer">
      <p><strong>CC-Educativa</strong> — 2026</p>
    </footer>
  </div>
</template>

<style scoped>
:global(html) {
  scroll-behavior: smooth;
  font-family: 'Poppins', sans-serif;
  background: linear-gradient(135deg, #e8eaf6 0%, #ede9fe 40%, #e0e7ff 100%);
  min-height: 100vh;
}
.site-container { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }

/* NAVBAR */
.navbar { background: white; border: 4px solid #1e293b; border-radius: 20px; padding: 1rem 1.5rem; margin-bottom: 2rem; box-shadow: 8px 8px 0px #1e293b; display: flex; justify-content: space-between; align-items: center; position: relative; }
.brand { font-weight: 900; font-size: 1.4rem; color: #6366f1; }
.menu-toggle { background: #6366f1; color: white; border: 3px solid #1e293b; padding: 6px 12px; border-radius: 10px; font-weight: bold; cursor: pointer; order: 2; }
.nav-links { display: none; }
.nav-links.is-open { display: flex; flex-direction: column; gap: 15px; position: absolute; top: 85px; right: 0; background: white; border: 4px solid #1e293b; padding: 1.5rem; border-radius: 20px; box-shadow: 8px 8px 0px #1e293b; z-index: 100; min-width: 200px; }
@media (min-width: 768px) {
  .menu-toggle { display: none; }
  .nav-links { display: flex; flex-direction: row; gap: 20px; order: 2; align-items: center; }
  .nav-links.is-open { position: static; box-shadow: none; border: none; padding: 0; }
}
.zoom-hover { transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; text-decoration: none; color: #1e293b; font-weight: 700; }
.zoom-hover:hover { transform: scale(1.1); }
.extra-link { color: #a855f7; border-bottom: 2px solid #a855f7; }

/* WELCOME */
.welcome-box { background: white; border: 4px solid #1e293b; border-radius: 20px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 6px 6px 0px #1e293b; text-align: center; }
.welcome-box h1 { font-weight: 900; font-size: 1.6rem; margin-bottom: 5px; }

/* CAROUSEL */
.hero-carousel { background: white; border: 4px solid #1e293b; border-radius: 25px; padding: 1.5rem; box-shadow: 10px 10px 0px #1e293b; margin-bottom: 2.5rem; overflow: hidden; }
.badge-new { display: inline-block; background: #facc15; border: 3px solid #1e293b; border-radius: 10px; padding: 4px 14px; font-weight: 900; font-size: 0.85rem; margin-bottom: 1rem; box-shadow: 3px 3px 0px #1e293b; }
.carousel-content { display: grid; grid-template-columns: 1fr; gap: 1rem; align-items: center; }
@media (min-width: 768px) { .carousel-content { grid-template-columns: 1fr 1fr; gap: 2rem; } }
.carousel-info { display: flex; flex-direction: column; gap: 0.75rem; }
.slide-title { font-weight: 900; font-size: clamp(1.1rem, 3vw, 1.7rem); color: #6366f1; line-height: 1.3; margin: 0; }
.slide-desc { color: #475569; line-height: 1.6; font-size: 0.95rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin: 0; }
.carousel-image { border: 4px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 5px 5px 0px #1e293b; height: 200px; }
@media (min-width: 768px) { .carousel-image { height: 240px; } }
.news-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.no-img { display: flex; align-items: center; justify-content: center; background: #f1f5f9; font-size: 4rem; }
.news-link { display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 10px 20px; border-radius: 12px; border: 3px solid #1e293b; font-weight: 900; box-shadow: 4px 4px 0px #1e293b; transition: transform 0.15s; align-self: flex-start; }
.news-link:hover { transform: translateY(-2px); }
.carousel-controls { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.25rem; }
.carousel-arrow { background: white; border: 3px solid #1e293b; border-radius: 50%; width: 40px; height: 40px; font-size: 1.5rem; font-weight: 900; cursor: pointer; box-shadow: 3px 3px 0px #1e293b; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; flex-shrink: 0; }
.carousel-arrow:hover { background: #6366f1; color: white; }
.carousel-dots { display: flex; gap: 8px; align-items: center; }
.dot { width: 11px; height: 11px; border-radius: 50%; background: #cbd5e1; border: 2px solid #1e293b; cursor: pointer; transition: background 0.2s, transform 0.2s; }
.dot.active { background: #6366f1; transform: scale(1.3); }
.slide-fade-enter-active, .slide-fade-leave-active { transition: opacity 0.35s ease, transform 0.35s ease; }
.slide-fade-enter-from { opacity: 0; transform: translateX(20px); }
.slide-fade-leave-to { opacity: 0; transform: translateX(-20px); }

/* CURSOS */
.section { margin-bottom: 2.5rem; }
.section-title { font-weight: 900; font-size: 1.5rem; margin-bottom: 1.25rem; }
.courses-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; }
.course-card { background: white; border: 4px solid #1e293b; border-radius: 24px; box-shadow: 6px 6px 0px #1e293b; overflow: hidden; text-align: center; transition: 0.2s; }
.course-card:hover { transform: translateY(-5px); box-shadow: 10px 10px 0px #1e293b; }
.card-header { background: #f1f5f9; padding: 15px; border-bottom: 4px solid #1e293b; font-weight: 900; font-size: 2.2rem; }
.card-header.highlight { background: #6366f1; color: white; }
.card-body { padding: 15px; display: flex; flex-direction: column; align-items: center; min-height: 110px; justify-content: center; }
.bold-subject { font-weight: 900; font-size: 1.1rem; margin-bottom: 15px; line-height: 1.2; }
.shift-selector-centered { display: flex; gap: 10px; margin-top: auto; justify-content: center; }
.s-btn { border: 3px solid #1e293b; background: white; padding: 5px 12px; border-radius: 10px; font-weight: 800; cursor: pointer; }
.s-btn.active { background: #1e293b; color: white; }

/* PANELES */
.info-split { display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 2.5rem; }
@media (min-width: 768px) { .info-split { grid-template-columns: 1.6fr 1fr; } }
.panel-box { background: white; border: 4px solid #1e293b; border-radius: 25px; padding: 2rem; box-shadow: 8px 8px 0px #1e293b; }
.panel-title { border-bottom: 4px solid #facc15; display: inline-block; margin-bottom: 1.5rem; padding-bottom: 5px; font-weight: 900; font-size: 1.3rem; }
.file-item { padding: 12px; background: #f1f5f9; border: 2px solid #1e293b; border-radius: 12px; font-weight: 800; display: flex; gap: 10px; margin-bottom: 10px; }
.code-display { background: #fefce8; padding: 20px; border: 4px dashed #6366f1; border-radius: 15px; text-align: center; font-size: 1.8rem; font-weight: 900; color: #6366f1; box-shadow: 4px 4px 0px #1e293b; }

/* ===================== EXTRAS CON TABS ===================== */
.extras-section { margin-top: 3rem; }

.tabs-bar { display: flex; gap: 10px; margin-bottom: 1.5rem; flex-wrap: wrap; }
.tab-btn { padding: 10px 22px; border: 3px solid #1e293b; border-radius: 12px; background: white; font-weight: 800; font-size: 0.95rem; cursor: pointer; box-shadow: 3px 3px 0px #1e293b; transition: background 0.15s, transform 0.15s; }
.tab-btn:hover { transform: translateY(-2px); }
.tab-btn.active { background: #6366f1; color: white; }

.tab-content { display: flex; flex-direction: column; gap: 1.5rem; }

/* Cards de juegos */
.game-card { background: white; border: 4px solid #1e293b; border-radius: 20px; padding: 1.5rem; box-shadow: 6px 6px 0px #1e293b; }
.game-card h3 { font-weight: 900; font-size: 1.2rem; margin-bottom: 0.5rem; }
.game-desc { color: #64748b; margin-bottom: 1rem; font-size: 0.95rem; }

/* Trivia */
.trivia-idle { text-align: center; padding: 1.5rem 0; }
.trivia-loading { text-align: center; padding: 1.5rem 0; color: #6366f1; font-weight: 700; font-size: 1.1rem; }
.trivia-score { display: inline-block; background: #e0e7ff; border: 2px solid #6366f1; border-radius: 8px; padding: 4px 14px; font-weight: 900; color: #6366f1; margin-bottom: 1rem; }
.trivia-q { font-weight: 800; font-size: 1.05rem; margin-bottom: 1rem; line-height: 1.4; }
.trivia-options { display: flex; flex-direction: column; gap: 10px; }
.option-btn { padding: 12px 16px; border: 3px solid #1e293b; border-radius: 12px; background: white; font-weight: 700; cursor: pointer; text-align: left; transition: background 0.15s, transform 0.15s; }
.option-btn:hover:not(.disabled) { background: #e0e7ff; transform: translateX(4px); }
.option-btn.correct { background: #bbf7d0; border-color: #16a34a; }
.option-btn.wrong { background: #fecaca; border-color: #dc2626; }
.option-btn.disabled { cursor: default; }
.trivia-feedback { margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 12px; border: 2px solid #e2e8f0; }
.feedback-ok { color: #16a34a; font-weight: 900; font-size: 1.1rem; margin: 0 0 0.5rem; }
.feedback-err { color: #dc2626; font-weight: 900; font-size: 1.1rem; margin: 0 0 0.5rem; }
.trivia-exp { color: #475569; line-height: 1.5; margin: 0; }
.trivia-actions { display: flex; gap: 10px; margin-top: 1rem; flex-wrap: wrap; }

.play-btn { background: #6366f1; color: white; border: 3px solid #1e293b; border-radius: 12px; padding: 12px 24px; font-weight: 900; cursor: pointer; box-shadow: 4px 4px 0px #1e293b; transition: transform 0.15s; }
.play-btn.small { padding: 8px 16px; font-size: 0.9rem; }
.play-btn:hover { transform: translateY(-2px); }
.reset-btn { background: white; border: 3px solid #1e293b; border-radius: 12px; padding: 8px 16px; font-weight: 800; cursor: pointer; box-shadow: 3px 3px 0px #1e293b; }

/* Juegos externos */
.game-links-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 1rem; }
.game-ext-link { display: flex; flex-direction: column; padding: 12px 16px; background: #f1f5f9; border: 3px solid #1e293b; border-radius: 14px; text-decoration: none; color: #1e293b; box-shadow: 3px 3px 0px #1e293b; transition: transform 0.15s, background 0.15s; }
.game-ext-link:hover { transform: translateX(4px); background: #e0e7ff; }
.ext-name { font-size: 1rem; font-weight: 900; }
.ext-desc { font-size: 0.85rem; color: #64748b; font-weight: 500; }

/* Videos */
.videos-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
@media (min-width: 768px) { .videos-grid { grid-template-columns: repeat(2, 1fr); } }
.video-card { background: white; border: 4px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 6px 6px 0px #1e293b; }
.video-embed { position: relative; padding-bottom: 56.25%; height: 0; }
.video-embed iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.video-info { padding: 1rem; border-top: 3px solid #1e293b; }
.video-info strong { font-weight: 900; display: block; margin-bottom: 4px; }
.video-info p { color: #64748b; font-size: 0.9rem; margin: 0; }

/* Links útiles */
.links-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
@media (min-width: 768px) { .links-grid { grid-template-columns: repeat(2, 1fr); } }
.extra-card { background: white; border: 4px solid #1e293b; border-radius: 20px; padding: 1.5rem; box-shadow: 6px 6px 0px #1e293b; }
.extra-card h4 { font-weight: 900; font-size: 1.1rem; margin-bottom: 0.5rem; }
.figaro-btn { display: block; background: #facc15; padding: 15px; border-radius: 12px; text-decoration: none; color: #1e293b; font-weight: 900; border: 3px solid #1e293b; box-shadow: 4px 4px 0px #1e293b; text-align: center; margin-top: 0.75rem; }

/* FOOTER */
.footer { margin-top: 4rem; text-align: center; font-weight: bold; color: #64748b; padding-bottom: 2rem; }
</style>