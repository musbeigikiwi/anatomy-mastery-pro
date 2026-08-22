const STORE = "ampro_complete_v2"; const TASKSTORE = "ampro_tasks_v1"; const DEFAULT_STATE = { todayKey: "", todaySec: 0, totalSec: 0, answered: 0, correct: 0, mistakes: [], attempts: [], flashAttempts: [] }; let state = (() => { try { const saved = JSON.parse(localStorage.getItem(STORE) || "{}"); return { ...DEFAULT_STATE, ...saved, mistakes: Array.isArray(saved.mistakes) ? saved.mistakes : [], attempts: Array.isArray(saved.attempts) ? saved.attempts : [], flashAttempts: Array.isArray(saved.flashAttempts) ? saved.flashAttempts : [] }; } catch { return { ...DEFAULT_STATE }; } })(); const save = () => { localStorage.setItem(STORE, JSON.stringify(state)); }; function getTodayKey() { const d = new Date(); const year = d.getFullYear(); const month = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; } if (state.todayKey !== getTodayKey()) { state.todayKey = getTodayKey(); state.todaySec = 0; } save(); const app = document.getElementById("app"); const $ = (id) => document.getElementById(id); function escapeHTML(value) { return String(value ?? "") .replace(/&/g, "&") .replace(//g, ">") .replace(/"/g, """) .replace(/'/g, "'"); } function escapeHtml(value) { return escapeHTML(value); } function jsArg(value) { return JSON.stringify(value); } function formatTime(seconds) { const n = Math.max(0, Number(seconds) || 0); const hours = Math.floor(n / 3600); const minutes = Math.floor((n % 3600) / 60); const remainingSeconds = Math.floor(n % 60); if (hours > 0) return `${hours}h ${minutes}m`; if (minutes > 0) return `${minutes}m ${remainingSeconds}s`; return `${remainingSeconds}s`; } let currentQuiz = null; let currentFlash = null; let examInterval = null; let fullMockState = null; /* ========================================== STUDY TIMER ========================================== */ setInterval(() => { if (!document.hidden) { state.todaySec += 1; state.totalSec += 1; if (state.totalSec % 5 === 0) { save(); } renderStats(); } }, 1000); function renderStats() { if ($("globalTimer")) $("globalTimer").textContent = formatTime(state.todaySec); if ($("stToday")) $("stToday").textContent = formatTime(state.todaySec); if ($("stTotal")) $("stTotal").textContent = formatTime(state.totalSec); if ($("stQ")) $("stQ").textContent = state.answered; if ($("stAcc")) { const accuracy = state.answered > 0 ? Math.round((state.correct / state.answered) * 100) : 0; $("stAcc").textContent = `${accuracy}%`; } if ($("stMist")) $("stMist").textContent = state.mistakes.length; } function renderDate() { if (!$("dateTop")) return; $("dateTop").textContent = new Date().toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }); } renderDate(); renderStats(); /* ========================================== NAVIGATION ========================================== */ document.addEventListener("click", (event) => { const button = event.target.closest("[data-route]"); if (!button) return; route(button.dataset.route); }); function route(name) { document.querySelectorAll(".nav button").forEach((button) => { button.classList.toggle("active", button.dataset.route === name); }); const routes = { home: renderHome, notes: renderNotesHome, flash: renderFlashHome, bank: renderQuestionBank, short: renderShortAnswers, quizzes: renderQuizzes, mocks: renderMocks, mistakes: renderMistakes, schedule: renderSchedule, progress: renderProgress }; (routes[name] || renderHome)(); window.scrollTo({ top: 120, behavior: "smooth" }); } /* ========================================== HELPERS ========================================== */ function heading(kicker, title, description = "") { return `
${escapeHTML(kicker)}

${escapeHTML(title)}

${escapeHTML(description)}

`; } function shuffle(array) { const copy = [...array]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; } /* ========================================== QUESTION DATABASE ========================================== */ function getAllQuestions() { if ( window.AM_MASTER_BANK && Array.isArray(window.AM_MASTER_BANK.mcqs) && window.AM_MASTER_BANK.mcqs.length > 0 ) { return window.AM_MASTER_BANK.mcqs.map((q) => ({ id: `master-${q.id}`, chapter: q.chapter, chapterTitle: q.chapter === 1 ? "Anatomy & Physiology" : q.chapter === 2 ? "Basic Chemistry" : q.chapter === 3 ? "Cells & Microscopes" : q.chapter === 4 ? "Cell Transport" : `Chapter ${q.chapter}`, question: q.question, options: Array.isArray(q.options) ? [...q.options] : [], correct: Number(q.correct), explanation: q.explanation || "", level: q.level || "CORE" })); } if (!window.AM_CHAPTERS) return []; return AM_CHAPTERS.flatMap((chapter) => chapter.mcq.map((question, index) => ({ id: `c${chapter.id}-${index + 1}`, chapter: chapter.id, chapterTitle: chapter.title, question: question[0], options: Array.isArray(question[1]) ? [...question[1]] : [], correct: Number(question[2]), explanation: question[3] || "", level: question[4] || "CORE" })) ); } function prepareQuestions(questions) { return shuffle(questions).map((question) => { const options = question.options.map((text, index) => ({ text, correct: index === Number(question.correct) })); const shuffledOptions = shuffle(options); return { ...question, shuffledOptions, correctIndex: shuffledOptions.findIndex((option) => option.correct) }; }); } /* ========================================== HOME ========================================== */ function renderHome() { if (!window.AM_CHAPTERS) { app.innerHTML = `
Chapter data failed to load.
`; return; } app.innerHTML = heading( "STUDY COMMAND CENTER", "Choose your next study session", "All learning tools are connected to the same progress system." ) + `
${AM_CHAPTERS.map((chapter) => `
CHAPTER ${chapter.id}
${escapeHTML(chapter.title)}

${escapeHTML(chapter.subtitle || "")}

${chapter.notes .slice(0, 3) .map((note) => escapeHTML(note[0])) .join(" â€¢ ")}

`).join("")}
`; } /* ========================================== NOTES ========================================== */ function renderNotesHome() { openNote(1); } function openNote(id) { const chapter = AM_CHAPTERS.find((chapter) => chapter.id === id); if (!chapter) return; app.innerHTML = heading( "COMPLETE NOTES", `Chapter ${id} â€” ${chapter.title}`, "High-yield notes with exam keys." ) + `
${AM_CHAPTERS.map((chapterItem) => `  Chapter ${chapterItem.id}  `).join("")}
${chapter.notes.map((note) => `
${escapeHTML(note[0])}

${escapeHTML(note[1])}

EXAM KEY: ${escapeHTML(note[2])}
`).join("")}
`; } /* ========================================== FLASHCARDS ========================================== */ function renderFlashHome() { if (!window.AM_CHAPTERS) { app.innerHTML = `
Flashcard data failed to load.
`; return; } app.innerHTML = heading( "ACTIVE RECALL", "Flashcard Decks", "Every deck is shuffled, timed and can be repeated." ) + `
${AM_CHAPTERS.map((chapter) => `
${Array.isArray(chapter.flash) ? chapter.flash.length : 0} CARDS
Chapter ${chapter.id}

${escapeHTML(chapter.title)}

`).join("")}
`; } function startFlash(id) { const chapter = AM_CHAPTERS.find((chapter) => chapter.id === id); if (!chapter || !Array.isArray(chapter.flash) || !chapter.flash.length) { return; } currentFlash = { id, title: `Chapter ${id} â€” ${chapter.title}`, cards: shuffle(chapter.flash), index: 0, startedAt: Date.now(), ratings: { again: 0, learning: 0, mastered: 0 } }; renderFlashCard(); } function renderFlashCard() { const card = currentFlash.cards[currentFlash.index]; const colours = [ ["#162a48", "#6386ff"], ["#14352e", "#55e1bb"], ["#3a2818", "#ffb45e"], ["#311d3e", "#c27cff"], ["#15333e", "#55c8ff"], ["#361d27", "#ff7ca2"] ]; const colour = colours[currentFlash.index % colours.length]; const elapsed = Math.round( (Date.now() - currentFlash.startedAt) / 1000 ); app.innerHTML = heading( "FLASHCARD SESSION", currentFlash.title, "Reveal the answer before rating yourself." ) + `
Card ${currentFlash.index + 1} / ${currentFlash.cards.length} ${formatTime(elapsed)}
CARD ${currentFlash.index + 1}

${escapeHTML(card[0])}

${escapeHTML(card[1])}
${escapeHTML(card[2] || "")}
Reveal Answer  Again  Learning  Mastered
`; } function revealFlash() { if ($("flashAnswer")) $("flashAnswer").style.display = "block"; if ($("flashExplain")) $("flashExplain").style.display = "block"; } function rateFlash(rating) { currentFlash.ratings[rating] += 1; if (currentFlash.index < currentFlash.cards.length - 1) { currentFlash.index += 1; renderFlashCard(); return; } finishFlash(); } function finishFlash() { const seconds = Math.round( (Date.now() - currentFlash.startedAt) / 1000 ); state.flashAttempts.push({ title: currentFlash.title, date: new Date().toISOString(), seconds, total: currentFlash.cards.length, ...currentFlash.ratings }); save(); app.innerHTML = heading( "DECK COMPLETE", "Flashcard Result", "This study session is saved." ) + `
${formatTime(seconds)}
Total
${currentFlash.cards.length}
Mastered
${currentFlash.ratings.mastered}
Learning
${currentFlash.ratings.learning}
Again
${currentFlash.ratings.again}
Avg / Card
${Math.round(seconds / currentFlash.cards.length)}s
Resit Full Deck   Back to Decks
`; } /* ========================================== QUESTION BANK ========================================== */ function renderQuestionBank() { const questions = getAllQuestions(); const chapterInfo = [ { id: 1, title: "Anatomy & Physiology" }, { id: 2, title: "Basic Chemistry" }, { id: 3, title: "Cells & Microscopes" }, { id: 4, title: "Cell Transport" } ]; app.innerHTML = heading( "MASTER QUESTION BANK", "Question Bank", "Question order and answer positions shuffle every new attempt." ) + `
${questions.length} QUESTIONS
All Chapters

Complete mixed Chapter 1â€“4 practice.

${chapterInfo.map((chapter) => { const count = questions.filter( (q) => Number(q.chapter) === Number(chapter.id) ).length; return `
${count} QUESTIONS
Chapter ${chapter.id}

${escapeHTML(chapter.title)}

`; }).join("")}
`; } function startChapterBank(id) { const questions = getAllQuestions().filter( (question) => Number(question.chapter) === Number(id) ); startQuiz( questions, `Chapter ${id} Question Bank`, true, "bank" ); } /* ========================================== QUIZ ENGINE ========================================== */ function startQuiz( questions, title, instantFeedback = true, source = "bank", minutes = null ) { if (!Array.isArray(questions) || !questions.length) { app.innerHTML = `
No questions available.
`; return; } clearInterval(examInterval); currentQuiz = { title, source, instantFeedback, questions: prepareQuestions(questions), index: 0, startedAt: Date.now(), questionStartedAt: Date.now(), answers: [], minutes, deadline: minutes ? Date.now() + Number(minutes) * 60000 : null }; renderQuizQuestion(); if (minutes) { examInterval = setInterval(() => { if (!currentQuiz) return; if (Date.now() >= currentQuiz.deadline) { clearInterval(examInterval); finishQuiz(); } else { updateQuizTimer(); } }, 1000); } } function updateQuizTimer() { const timer = $("sessionTimer"); if (!timer || !currentQuiz) return; if (currentQuiz.deadline) { timer.textContent = formatTime( Math.max( 0, Math.round((currentQuiz.deadline - Date.now()) / 1000) ) ); } else { timer.textContent = formatTime( Math.round((Date.now() - currentQuiz.startedAt) / 1000) ); } } function renderQuizQuestion() { const question = currentQuiz.questions[currentQuiz.index]; const answer = currentQuiz.answers[currentQuiz.index]; const sessionTime = currentQuiz.deadline ? Math.max( 0, Math.round((currentQuiz.deadline - Date.now()) / 1000) ) : Math.round((Date.now() - currentQuiz.startedAt) / 1000); app.innerHTML = heading( currentQuiz.instantFeedback ? "LIVE PRACTICE" : "TIMED MOCK EXAM", currentQuiz.title, currentQuiz.instantFeedback ? "Correct answer and explanation appear immediately." : "Feedback is hidden until Submit." ) + `
Question ${currentQuiz.index + 1} / ${currentQuiz.questions.length} ${formatTime(sessionTime)}
CHAPTER ${escapeHTML(question.chapter ?? "")} â€¢ ${escapeHTML(question.level || "REVIEW")}

${escapeHTML(question.question)}

${question.shuffledOptions.map((option, index) => `  ${String.fromCharCode(65 + index)}. ${escapeHTML(option.text)}  `).join("")}
${ currentQuiz.index === currentQuiz.questions.length - 1 ? "Submit" : "Next Question" }
`; } function upsertMistake(mistake) { const index = state.mistakes.findIndex( (item) => item.id === mistake.id ); if (index >= 0) { state.mistakes[index] = { ...state.mistakes[index], ...mistake }; } else { state.mistakes.push(mistake); } save(); } function removeMistakeById(id) { const before = state.mistakes.length; state.mistakes = state.mistakes.filter( (mistake) => mistake.id !== id ); if (state.mistakes.length !== before) { save(); } } function chooseAnswer(choice) { if (currentQuiz.answers[currentQuiz.index]) return; const question = currentQuiz.questions[currentQuiz.index]; const seconds = Math.round( (Date.now() - currentQuiz.questionStartedAt) / 1000 ); const correct = choice === question.correctIndex; currentQuiz.answers[currentQuiz.index] = { choice, correct, seconds }; state.answered += 1; if (correct) { state.correct += 1; removeMistakeById(question.id); } else { upsertMistake({ id: question.id, source: currentQuiz.source, chapter: question.chapter, question: question.question, options: question.shuffledOptions.map((option) => option.text), selected: question.shuffledOptions[choice]?.text || "", selectedIndex: choice, correct: question.shuffledOptions[question.correctIndex]?.text || "", correctIndex: question.correctIndex, explanation: question.explanation || "", level: question.level || "REVIEW" }); } if (currentQuiz.instantFeedback) { document.querySelectorAll(".option").forEach((button, index) => { if (index === question.correctIndex) { button.classList.add("correct"); } else if (index === choice) { button.classList.add("wrong"); } }); if ($("feedback")) { $("feedback").style.display = "block"; $("feedback").innerHTML = ` ${correct ? "âœ“ Correct" : "âœ• Review this concept"}
${escapeHTML(question.explanation || "")}
Time: ${seconds}s `; } } if ($("nextButton")) { $("nextButton").style.display = "inline-block"; } save(); renderStats(); } function nextQuizQuestion() { if (currentQuiz.index < currentQuiz.questions.length - 1) { currentQuiz.index += 1; currentQuiz.questionStartedAt = Date.now(); renderQuizQuestion(); return; } finishQuiz(); } function finishQuiz() { clearInterval(examInterval); if (!currentQuiz) return; const quiz = currentQuiz; const seconds = Math.round( (Date.now() - quiz.startedAt) / 1000 ); const answered = quiz.answers.filter(Boolean).length; const correct = quiz.answers.filter( (answer) => answer && answer.correct ).length; const total = quiz.questions.length; const score = total ? Math.round((correct / total) * 100) : 0; state.attempts.push({ title: quiz.title, date: new Date().toISOString(), source: quiz.source, seconds, correct, answered, total, score }); save(); app.innerHTML = heading( "ATTEMPT COMPLETE", quiz.title, "Full answer review is now unlocked." ) + `
${score}%
Correct
${correct}
Incorrect
${answered - correct}
Unanswered
${total - answered}
Total Time
${formatTime(seconds)}
Avg / Q
${answered ? Math.round(seconds / answered) : 0}s
Resit Full Set  Retry Mistakes
Full Answer Review

${quiz.questions.map((question, index) => { const answer = quiz.answers[index]; return `
Q${index + 1}. ${escapeHTML(question.question)}
Your answer: ${ answer ? escapeHTML( question.shuffledOptions[answer.choice]?.text || "" ) : "Unanswered" }
Correct: ${escapeHTML( question.shuffledOptions[question.correctIndex]?.text || "" )}
${escapeHTML(question.explanation || "")}

`; }).join("")}
`; if ($("resitButton")) { $("resitButton").onclick = () => { const questions = quiz.questions.map((question) => ({ id: question.id, chapter: question.chapter, question: question.question, options: question.shuffledOptions.map((option) => option.text), correct: question.correctIndex, explanation: question.explanation, level: question.level })); startQuiz( questions, quiz.title, quiz.instantFeedback, quiz.source, quiz.minutes ); }; } if ($("retryButton")) { $("retryButton").onclick = () => { const missed = quiz.questions .filter((question, index) => { const answer = quiz.answers[index]; return !answer || !answer.correct; }) .map((question) => ({ id: question.id, chapter: question.chapter, question: question.question, options: question.shuffledOptions.map((option) => option.text), correct: question.correctIndex, explanation: question.explanation, level: question.level })); if (missed.length) { startQuiz( missed, "Retry Missed Questions", true, quiz.source ); } }; } } /* ========================================== SHORT ANSWERS ========================================== */ function renderShortAnswers() { const shortAnswers = window.AM_MASTER_BANK && Array.isArray(window.AM_MASTER_BANK.shortAnswers) ? window.AM_MASTER_BANK.shortAnswers : []; const total = shortAnswers.length; const chapterTitles = { 1: "Anatomy & Physiology", 2: "Basic Chemistry", 3: "Cells & Microscopes", 4: "Cell Transport" }; const chapterCards = [1, 2, 3, 4] .map((chapterNumber) => { const count = shortAnswers.filter( (item) => Number(item.chapter) === chapterNumber ).length; return `
${count} SHORT ANSWERS
Chapter ${chapterNumber}

${chapterTitles[chapterNumber]}

Start Chapter
`; }) .join(""); app.innerHTML = heading( "WRITTEN RECALL", "Short Answers", "Write your answer first, then reveal the model answer and marking points." ) + `
Total Short Answers ${total}
Chapters 4
${total} SHORT ANSWERS
All Chapters

Mixed written-recall practice from Chapters 1â€“4.

Start All
${chapterCards}
`; } function openShortAnswerChapter(chapterNumber) { const allShortAnswers = window.AM_MASTER_BANK && Array.isArray(window.AM_MASTER_BANK.shortAnswers) ? window.AM_MASTER_BANK.shortAnswers : []; const questions = Number(chapterNumber) === 0 ? [...allShortAnswers] : allShortAnswers.filter( (item) => Number(item.chapter) === Number(chapterNumber) ); if (!questions.length) { app.innerHTML = heading( "WRITTEN RECALL", "No Short Answers Yet", "There are no short-answer questions loaded for this chapter." ) + `  Back to Short Answers  `; return; } let currentIndex = 0; function showQuestion() { const item = questions[currentIndex]; const markingPoints = Array.isArray(item.markingPoints) ? item.markingPoints .map((point) => `
${escapeHTML(String(point))}
`) .join("") : ""; app.innerHTML = `
SHORT ANSWER ${currentIndex + 1} OF ${questions.length}

${ Number(chapterNumber) === 0 ? "All Chapters" : `Chapter ${chapterNumber}` }

Write your own answer before revealing the model answer.

SA${escapeHTML(item.id)} â€¢ Chapter ${escapeHTML(item.chapter)} ${item.marks ? `â€¢ ${escapeHTML(item.marks)} marks` : ""}
${escapeHTML(item.question || "")}

Your Answer 
Reveal Model Answer
Back
Previous
${ currentIndex === questions.length - 1 ? "Finish" : "Next Question" }
`; $("revealShortAnswerBtn").addEventListener("click", () => { $("shortAnswerModel").style.display = "block"; $("revealShortAnswerBtn").textContent = "Model Answer Revealed"; $("revealShortAnswerBtn").disabled = true; }); $("backShortAnswersBtn").addEventListener("click", () => { renderShortAnswers(); }); if ($("previousShortAnswerBtn")) { $("previousShortAnswerBtn").addEventListener("click", () => { if (currentIndex > 0) { currentIndex--; showQuestion(); } }); } $("nextShortAnswerBtn").addEventListener("click", () => { if (currentIndex < questions.length - 1) { currentIndex++; showQuestion(); } else { renderShortAnswers(); } }); } showQuestion(); } function revealModel(button) { button.parentElement.nextElementSibling.style.display = "block"; } /* ========================================== QUIZZES ========================================== */ function renderQuizzes() { if (!window.AM_QUIZZES) { app.innerHTML = `
Quiz data failed to load.
`; return; } app.innerHTML = heading( "COURSE PRACTICE", "Quiz Sets", "Teacher and revision-style practice." ) + `
${AM_QUIZZES.map((quiz, index) => `
${escapeHTML(String(quiz.mode || "practice").toUpperCase())}
${escapeHTML(quiz.title)}

${ quiz.chapter ? `Chapter ${escapeHTML(quiz.chapter)}` : "Mixed Chapters 1â€“4" }

`).join("")}
`; } function launchQuiz(index) { const quiz = AM_QUIZZES[index]; let questions; if ( Array.isArray(quiz.questions) && quiz.questions.length > 0 ) { questions = quiz.questions.map((q) => ({ ...q, chapter: q.chapter ?? quiz.chapter ?? 0, correct: Number(q.correct) })); } else if (quiz.chapter) { questions = getAllQuestions().filter( (question) => Number(question.chapter) === Number(quiz.chapter) ); } else { questions = getAllQuestions(); } if (!questions.length) { alert("No questions are available for this quiz yet."); return; } startQuiz( questions, quiz.title, true, "quizzes" ); } /* ========================================== MOCKS ========================================== */ function renderMocks() { if (!window.AM_MOCKS) { app.innerHTML = `
Mock data failed to load.
`; return; } app.innerHTML = heading( "EXAM CENTRE", "Mock Exams", "Timed simulation with full review after Submit." ) + `
${AM_MOCKS.map((mock, index) => { const total = (Array.isArray(mock.mcqs) ? mock.mcqs.length : 0) + (Array.isArray(mock.shortAnswers) ? mock.shortAnswers.length : 0); return `
${mock.minutes || 30} MIN
${escapeHTML(mock.title)}

${ total ? `${total} Questions â€¢ Chapters 1â€“4` : "Timed Chapter 1â€“4 exam simulation." }

`; }).join("")}
`; } function launchMock(index) { const mock = AM_MOCKS[index]; if (!mock) { alert("Mock exam could not be loaded."); return; } if ( Array.isArray(mock.mcqs) && Array.isArray(mock.shortAnswers) ) { startFullMockExam(mock); return; } const pool = shuffle(getAllQuestions()); const questions = pool.slice( 0, Math.min(20, pool.length) ); startQuiz( questions, mock.title, false, "mocks", mock.minutes ); } function startFullMockExam(mock) { clearInterval(examInterval); fullMockState = { mock, mcqs: shuffle([...mock.mcqs]), shortAnswers: [...mock.shortAnswers], mcqAnswers: {}, shortResponses: {}, submitted: false, startedAt: Date.now(), deadline: mock.minutes ? Date.now() + Number(mock.minutes) * 60000 : null }; renderFullMockExam(); if (fullMockState.deadline) { examInterval = setInterval(() => { if (!fullMockState || fullMockState.submitted) { clearInterval(examInterval); return; } updateFullMockTimer(); if (Date.now() >= fullMockState.deadline) { clearInterval(examInterval); submitFullMockExam(); } }, 1000); } } function updateFullMockTimer() { if (!$("fullMockTimer") || !fullMockState) return; const seconds = fullMockState.deadline ? Math.max( 0, Math.round((fullMockState.deadline - Date.now()) / 1000) ) : Math.round((Date.now() - fullMockState.startedAt) / 1000); $("fullMockTimer").textContent = formatTime(seconds); } function renderFullMockExam() { const exam = fullMockState; if (!exam) return; const mock = exam.mock; const totalQuestions = exam.mcqs.length + exam.shortAnswers.length; const timerSeconds = exam.deadline ? Math.max( 0, Math.round((exam.deadline - Date.now()) / 1000) ) : Math.round((Date.now() - exam.startedAt) / 1000); app.innerHTML = heading( "EXAM CENTRE", mock.title, `${totalQuestions} Questions â€¢ ${exam.mcqs.length} MCQ + ${exam.shortAnswers.length} Short Answers` ) + `
${totalQuestions} Questions
${exam.mcqs.length} MCQ + ${exam.shortAnswers.length} Short Answers
${formatTime(timerSeconds)}
${mock.minutes || 30} minute limit
PART A â€” Multiple Choice

${exam.mcqs.map((q, index) => `
QUESTION ${index + 1} / ${totalQuestions}
${escapeHTML(q.question)}

${(Array.isArray(q.options) ? q.options : []).map((option, optionIndex) => `
 ${String.fromCharCode(65 + optionIndex)}. ${escapeHTML(option)}
`).join("")}
`).join("")}
PART B â€” Short Answers

${exam.shortAnswers.map((q, index) => `
QUESTION ${exam.mcqs.length + index + 1} / ${totalQuestions} ${q.marks ? `â€¢ ${escapeHTML(q.marks)} MARKS` : ""}
${escapeHTML(q.question)}


`).join("")} Submit Full Mock Exam
`; } function saveMockMCQ(questionId, answerIndex) { if (!fullMockState || fullMockState.submitted) return; fullMockState.mcqAnswers[questionId] = Number(answerIndex); } function saveMockShortAnswer(questionId, value) { if (!fullMockState || fullMockState.submitted) return; fullMockState.shortResponses[questionId] = value; } function saveMockMistake(mistake) { upsertMistake(mistake); } function submitFullMockExam() { const exam = fullMockState; if (!exam || exam.submitted) { return; } clearInterval(examInterval); let mcqCorrect = 0; let mcqAnswered = 0; exam.mcqs.forEach((q) => { const rawSelected = exam.mcqAnswers[q.id]; const hasAnswer = rawSelected !== undefined && rawSelected !== null && rawSelected !== ""; const selected = hasAnswer ? Number(rawSelected) : null; const correct = Number(q.correct); if (hasAnswer) { mcqAnswered++; state.answered++; } if (hasAnswer && selected === correct) { mcqCorrect++; state.correct++; removeMistakeById( `mock-${exam.mock.id ?? exam.mock.title}-${q.id}` ); } else { const options = Array.isArray(q.options) ? [...q.options] : []; const correctText = options[correct] ?? ""; const selectedText = hasAnswer ? (options[selected] ?? "") : "Not answered"; saveMockMistake({ id: `mock-${exam.mock.id ?? exam.mock.title}-${q.id}`, originalId: q.id, mockId: exam.mock.id ?? null, source: "Mock Exam", title: exam.mock.title, chapter: q.chapter || "1â€“4", question: q.question, options, selected: selectedText, selectedIndex: selected, correct: correctText, correctIndex: correct, explanation: q.explanation || "", level: q.level || "MOCK REVIEW" }); } }); const mcqPercent = exam.mcqs.length ? Math.round( (mcqCorrect / exam.mcqs.length) * 100 ) : 0; const seconds = Math.round( (Date.now() - exam.startedAt) / 1000 ); state.attempts.push({ title: exam.mock.title, date: new Date().toISOString(), source: "mocks", seconds, correct: mcqCorrect, answered: mcqAnswered, total: exam.mcqs.length, score: mcqPercent }); exam.submitted = true; save(); renderStats(); app.innerHTML = heading( "MOCK EXAM COMPLETE", exam.mock.title, "MCQs are automatically marked. Compare your written answers with the model answers below." ) + `
${mcqPercent}%
MCQ Correct
${mcqCorrect}/${exam.mcqs.length}
Incorrect
${exam.mcqs.length - mcqCorrect}
MCQ Answered
${mcqAnswered}/${exam.mcqs.length}
Short Answers
${exam.shortAnswers.length}
Total Time
${formatTime(seconds)}
PART A â€” MCQ Review

${exam.mcqs.map((q, index) => { const rawSelected = exam.mcqAnswers[q.id]; const hasAnswer = rawSelected !== undefined && rawSelected !== null && rawSelected !== ""; const selected = hasAnswer ? Number(rawSelected) : null; const correct = Number(q.correct); const isCorrect = hasAnswer && selected === correct; const options = Array.isArray(q.options) ? q.options : []; return `
Question ${index + 1}. ${escapeHTML(q.question)}
Your answer: ${ hasAnswer ? escapeHTML(options[selected] || "") : "Not answered" }
Correct: ${escapeHTML(options[correct] || "")}
${escapeHTML(q.explanation || "")}

`; }).join("")}
PART B â€” Short Answer Review

${exam.shortAnswers.map((q, index) => { const studentAnswer = exam.shortResponses[q.id] || ""; return `
QUESTION ${exam.mcqs.length + index + 1} ${q.marks ? `â€¢ ${escapeHTML(q.marks)} MARKS` : ""}
${escapeHTML(q.question)}

Your answer:
${ studentAnswer.trim() ? escapeHTML(studentAnswer) : "Not answered" }

Model answer:
${escapeHTML(q.modelAnswer || "")}

`; }).join("")}
Back to Mock Exams   Review Mistakes
`; } /* ========================================== MISTAKE VAULT ========================================== */ function renderMistakes() { app.innerHTML = heading( "TARGETED RECOVERY", "Mistake Vault", "Incorrect answers are automatically saved." ) + ( state.mistakes.length ? `
Retry All Mistakes   Clear Vault
${state.mistakes.map((mistake) => `
${ mistake.source === "Mock Exam" ? "MOCK EXAM" : `CHAPTER ${escapeHTML(mistake.chapter ?? "")}` }
${escapeHTML(mistake.question)}

${ mistake.selected !== undefined ? `
Your answer: ${escapeHTML(mistake.selected)}

` : "" }
Correct: ${escapeHTML(mistake.correct)}

${escapeHTML(mistake.explanation || "")}

`).join("")} ` : `
No mistakes waiting ðŸŽ¯
` ); } function buildMockQuestionIndex() { const index = []; if (!Array.isArray(window.AM_MOCKS)) { return index; } window.AM_MOCKS.forEach((mock) => { if (!Array.isArray(mock.mcqs)) return; mock.mcqs.forEach((q) => { index.push({ mock, q, generatedId: `mock-${mock.id ?? mock.title}-${q.id}` }); }); }); return index; } function retryMistakes() { if ( !Array.isArray(state.mistakes) || state.mistakes.length === 0 ) { alert("There are no mistakes to retry."); return; } const masterQuestions = getAllQuestions(); const mockIndex = buildMockQuestionIndex(); const retryQuestions = state.mistakes .map((mistake) => { /* 1. Question bank / quiz mistakes */ const normalQuestion = masterQuestions.find( (q) => q.id === mistake.id ); if (normalQuestion) { return { id: normalQuestion.id, chapter: normalQuestion.chapter, chapterTitle: normalQuestion.chapterTitle, question: normalQuestion.question, options: [...normalQuestion.options], correct: Number(normalQuestion.correct), explanation: normalQuestion.explanation || "", level: normalQuestion.level || "REVIEW" }; } /* 2. New mock format: the full question is saved in localStorage */ if ( mistake.source === "Mock Exam" && Array.isArray(mistake.options) && mistake.options.length > 1 && Number.isInteger(Number(mistake.correctIndex)) ) { return { id: mistake.id, chapter: mistake.chapter || "1â€“4", chapterTitle: mistake.title || "Mock Exam", question: mistake.question, options: [...mistake.options], correct: Number(mistake.correctIndex), explanation: mistake.explanation || "", level: mistake.level || "MOCK MISTAKE REVIEW" }; } /* 3. Old mock format: recover the original question from AM_MOCKS */ if (mistake.source === "Mock Exam") { const original = mockIndex.find((item) => { return ( item.generatedId === mistake.id || String(item.q.id) === String(mistake.originalId ?? "") || item.q.question === mistake.question ); }); if ( original && Array.isArray(original.q.options) && original.q.options.length > 1 ) { return { id: mistake.id, chapter: original.q.chapter || mistake.chapter || "1â€“4", chapterTitle: original.mock.title || mistake.title || "Mock Exam", question: original.q.question, options: [...original.q.options], correct: Number(original.q.correct), explanation: original.q.explanation || "", level: original.q.level || "MOCK MISTAKE REVIEW" }; } } return null; }) .filter(Boolean); if (!retryQuestions.length) { alert( "No retryable questions were found. Clear the Mistake Vault, complete a new mock exam, then try again." ); return; } startQuiz( retryQuestions, "Retry All Mistakes", true, "mistakes" ); } function clearMistakes() { if (!confirm("Clear all saved mistakes?")) { return; } state.mistakes = []; save(); renderStats(); renderMistakes(); } /* ========================================== SCHEDULE ========================================== */ function getTaskMap() { try { return JSON.parse( localStorage.getItem(TASKSTORE) || "{}" ); } catch { return {}; } } function renderSchedule() { if (!window.AM_SCHEDULE) { app.innerHTML = `
Schedule data failed to load.
`; return; } const completed = getTaskMap(); const tasks = [...AM_SCHEDULE].sort( (a, b) => a.date.localeCompare(b.date) ); app.innerHTML = heading( "STREAM C", "Schedule & Tasks", "Mark completed tasks and keep your course timeline organised." ) + tasks.map((task) => `
${ new Date( task.date + "T12:00:00" ).toLocaleDateString( "en-NZ", { weekday: "short", day: "numeric", month: "short" } ) } â€¢ Week ${escapeHTML(task.week)}
${escapeHTML(task.title)}

${ task.stream === "C" ? "Stream C relevant" : task.stream === "Other" ? "Other streams" : "All streams" }

${completed[task.id] ? "Completed âœ“" : "Mark Done"}
`).join(""); } function toggleTask(id) { const completed = getTaskMap(); completed[id] = !completed[id]; localStorage.setItem( TASKSTORE, JSON.stringify(completed) ); renderSchedule(); renderPriority(); } /* ========================================== NEXT PRIORITY ========================================== */ function renderPriority() { if (!window.AM_SCHEDULE) { if ($("priorityTitle")) { $("priorityTitle").textContent = "Schedule unavailable"; } return; } const completed = getTaskMap(); const today = getTodayKey(); const next = AM_SCHEDULE .filter( (task) => task.date >= today && !completed[task.id] && task.stream !== "Other" ) .sort( (a, b) => a.date.localeCompare(b.date) )[0]; if (!next) { if ($("priorityTitle")) { $("priorityTitle").textContent = "No upcoming tasks"; } if ($("priorityMeta")) { $("priorityMeta").textContent = ""; } return; } if ($("weekLabel")) { $("weekLabel").textContent = `WEEK ${next.week} â€¢ STREAM C`; } if ($("priorityTitle")) { $("priorityTitle").textContent = next.title; } const nextDate = new Date( next.date + "T12:00:00" ); const now = new Date(); const days = Math.ceil( (nextDate - now) / 86400000 ); if ($("priorityMeta")) { $("priorityMeta").textContent = `${ nextDate.toLocaleDateString( "en-NZ", { weekday: "long", day: "numeric", month: "long" } ) } â€¢ ${ days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days` }`; } } /* ========================================== PROGRESS ========================================== */ function renderProgress() { const attempts = [...state.attempts].reverse(); const flashAttempts = [...state.flashAttempts].reverse(); const bestScore = state.attempts.length ? Math.max( ...state.attempts.map( (attempt) => Number(attempt.score) || 0 ) ) : 0; app.innerHTML = heading( "LEARNING ANALYTICS", "Progress History", "Scores and study time are saved on this browser." ) + `
Attempts ${state.attempts.length}
Flash Decks ${state.flashAttempts.length}
Best Score ${bestScore}%
Total Study ${formatTime(state.totalSec)}
Quiz / Exam Attempts

${ attempts.length ? attempts.map((attempt) => `
${escapeHTML(attempt.title)}
${ new Date( attempt.date ).toLocaleString("en-NZ") } â€¢ ${attempt.score}% â€¢ ${attempt.correct}/${attempt.total} â€¢ ${formatTime(attempt.seconds)}

`).join("") : `
No completed attempts yet.
` }
Flashcard Attempts

${ flashAttempts.length ? flashAttempts.map((attempt) => `
${escapeHTML(attempt.title)}
${ new Date( attempt.date ).toLocaleString("en-NZ") } â€¢ ${formatTime(attempt.seconds)} â€¢ Mastered ${attempt.mastered}/${attempt.total}

`).join("") : `
No completed flashcard decks yet.
` } `; } /* ========================================== WEATHER ========================================== */ function getWeatherDescription(code) { const descriptions = { 0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy", 45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers", 81: "Rain showers", 82: "Heavy showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm" }; return descriptions[code] || "Current weather"; } function applyWeatherTheme(temperature, code) { document.body.classList.remove( "weather-freezing", "weather-cold", "weather-cool", "weather-mild", "weather-warm", "weather-hot", "weather-rain", "weather-clear" ); const rainCodes = [ 51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99 ]; if (rainCodes.includes(code)) { document.body.classList.add("weather-rain"); return; } if (code === 0 || code === 1) { document.body.classList.add("weather-clear"); } if (temperature <= 5) { document.body.classList.add("weather-freezing"); } else if (temperature <= 10) { document.body.classList.add("weather-cold"); } else if (temperature <= 17) { document.body.classList.add("weather-cool"); } else if (temperature <= 24) { document.body.classList.add("weather-mild"); } else if (temperature <= 30) { document.body.classList.add("weather-warm"); } else { document.body.classList.add("weather-hot"); } } async function loadWeather(latitude, longitude) { try { const url = "https://api.open-meteo.com/v1/forecast" + `?latitude=${latitude}` + `&longitude=${longitude}` + "¤t=temperature_2m,apparent_temperature,weather_code" + "&timezone=auto"; const response = await fetch(url); if (!response.ok) { throw new Error("Weather unavailable"); } const data = await response.json(); const temperature = Math.round(data.current.temperature_2m); const feelsLike = Math.round(data.current.apparent_temperature); const code = data.current.weather_code; const condition = getWeatherDescription(code); if ($("stWeather")) { $("stWeather").textContent = `${temperature}Â°C`; } if ($("stCondition")) { $("stCondition").textContent = `${condition} â€¢ Feels ${feelsLike}Â°C`; } if ($("weatherTop")) { $("weatherTop").textContent = `${temperature}Â°C â€¢ ${condition}`; } applyWeatherTheme( temperature, code ); } catch (error) { console.error(error); if ($("weatherTop")) { $("weatherTop").textContent = "Weather unavailable"; } if ($("stWeather")) { $("stWeather").textContent = "--Â°C"; } } } async function loadLocationName(latitude, longitude) { try { const url = "https://api.bigdatacloud.net/data/reverse-geocode-client" + `?latitude=${latitude}` + `&longitude=${longitude}` + "&localityLanguage=en"; const response = await fetch(url); if (!response.ok) { throw new Error( "Location unavailable" ); } const data = await response.json(); const city = data.city || data.locality || data.localityInfo?.administrative?.[2]?.name || "Local area"; const region = data.principalSubdivision || ""; const country = data.countryName || ""; const shortLocation = region ? `${city}, ${region}` : city; if ($("locationTop")) { $("locationTop").textContent = shortLocation; } if ($("stLocation")) { $("stLocation").textContent = country ? `${shortLocation}, ${country}` : shortLocation; } } catch (error) { console.error(error); if ($("locationTop")) { $("locationTop").textContent = "Your location"; } if ($("stLocation")) { $("stLocation").textContent = "Location unavailable"; } } } async function approximateLocation() { try { const response = await fetch( "https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en" ); if (!response.ok) { throw new Error( "Approximate location unavailable" ); } const data = await response.json(); const city = data.city || data.locality || "Your area"; const region = data.principalSubdivision || ""; const text = region ? `${city}, ${region}` : city; if ($("locationTop")) { $("locationTop").textContent = text; } if ($("stLocation")) { $("stLocation").textContent = text; } if ( data.latitude && data.longitude ) { await loadWeather( data.latitude, data.longitude ); } } catch { if ($("locationTop")) { $("locationTop").textContent = "Location unavailable"; } } } function startWeatherSystem() { if (!navigator.geolocation) { approximateLocation(); return; } navigator.geolocation.getCurrentPosition( async (position) => { const latitude = position.coords.latitude; const longitude = position.coords.longitude; await Promise.all([ loadLocationName( latitude, longitude ), loadWeather( latitude, longitude ) ]); }, () => { approximateLocation(); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 } ); } /* ========================================== START ========================================== */ renderPriority(); renderHome(); startWeatherSystem();
