const STORE =
  "ampro_complete_v2";

const TASKSTORE =
  "ampro_tasks_v1";


const DEFAULT_STATE = {

  todayKey: "", 

  todaySec: 0,

  totalSec: 0,

  answered: 0,

  correct: 0,

  mistakes: [],

  attempts: [],

  flashAttempts: []

};


let state = (() => {

  try {

    return {

      ...DEFAULT_STATE,

      ...JSON.parse(
        localStorage.getItem(STORE)
        || "{}"
      )

    };

  } catch {

    return {
      ...DEFAULT_STATE
    };

  }

})();


const save = () => {

  localStorage.setItem(
    STORE,
    JSON.stringify(state)
  );

};


function getTodayKey() {

  const d =
    new Date();

  const year =
    d.getFullYear();

  const month =
    String(
      d.getMonth() + 1
    ).padStart(2,"0");

  const day =
    String(
      d.getDate()
    ).padStart(2,"0");

  return `${year}-${month}-${day}`;

}


if (
  state.todayKey !==
  getTodayKey()
) {

  state.todayKey =
    getTodayKey();

  state.todaySec =
    0;

}


save();



const app =
  document.getElementById("app");


const $ = (id) =>
  document.getElementById(id);


function formatTime(seconds) {

  const hours =
    Math.floor(
      seconds / 3600
    );


  const minutes =
    Math.floor(
      (seconds % 3600) / 60
    );


  const remainingSeconds =
    seconds % 60;


  if (hours > 0) {

    return `${hours}h ${minutes}m`;

  }


  if (minutes > 0) {

    return `${minutes}m ${remainingSeconds}s`;

  }


  return `${remainingSeconds}s`;

}


let currentQuiz = null;

let currentFlash = null;

let examInterval = null;



/* ==========================================
   STUDY TIMER
========================================== */

setInterval(() => {

  if (!document.hidden) {

    state.todaySec += 1;

    state.totalSec += 1;


    if (
      state.totalSec % 5 === 0
    ) {

      save();

    }


    renderStats();

  }

}, 1000);



function renderStats() {

  if ($("globalTimer")) {

    $("globalTimer")
      .textContent =
      formatTime(
        state.todaySec
      );

  }


  if ($("stToday")) {

    $("stToday")
      .textContent =
      formatTime(
        state.todaySec
      );

  }


  if ($("stTotal")) {

    $("stTotal")
      .textContent =
      formatTime(
        state.totalSec
      );

  }


  if ($("stQ")) {

    $("stQ")
      .textContent =
      state.answered;

  }


  if ($("stAcc")) {

    const accuracy =

      state.answered > 0

        ? Math.round(
            (
              state.correct /
              state.answered
            ) * 100
          )

        : 0;


    $("stAcc")
      .textContent =
      `${accuracy}%`;

  }


  if ($("stMist")) {

    $("stMist")
      .textContent =
      state.mistakes.length;

  }

}



function renderDate() {

  if (!$("dateTop")) {
    return;
  }


  $("dateTop")
    .textContent =

    new Date()
      .toLocaleDateString(
        "en-NZ",
        {
          weekday:
            "short",

          day:
            "numeric",

          month:
            "short"
        }
      );

}


renderDate();

renderStats();



/* ==========================================
   NAVIGATION
========================================== */

document
  .addEventListener(
    "click",
    (event) => {

      const button =
        event.target.closest(
          "[data-route]"
        );


      if (!button) {
        return;
      }


      route(
        button.dataset.route
      );

    }
  );



function route(name) {

  document
    .querySelectorAll(
      ".nav button"
    )
    .forEach(
      (button) => {

        button
          .classList
          .toggle(
            "active",
            button.dataset.route
              === name
          );

      }
    );


  const routes = {

    home:
      renderHome,

    notes:
      renderNotesHome,

    flash:
      renderFlashHome,

    bank:
      renderQuestionBank,

    short:
      renderShortAnswers,

    quizzes:
      renderQuizzes,

    mocks:
      renderMocks,

    mistakes:
      renderMistakes,

    schedule:
      renderSchedule,

    progress:
      renderProgress

  };


  (
    routes[name]
    || renderHome
  )();


  window.scrollTo({
    top: 120,
    behavior: "smooth"
  });

}



/* ==========================================
   HELPERS
========================================== */

function heading(
  kicker,
  title,
  description = ""
) {

  return `

    <div class="head">

      <div>

        <p class="eyebrow">
          ${kicker}
        </p>

        <h2>
          ${title}
        </h2>

      </div>

      <p>
        ${description}
      </p>

    </div>

  `;

}



function shuffle(array) {

  const copy =
    [...array];


  for (
    let i =
      copy.length - 1;

    i > 0;

    i--
  ) {

    const j =
      Math.floor(
        Math.random()
        * (i + 1)
      );


    [
      copy[i],
      copy[j]
    ] = [
      copy[j],
      copy[i]
    ];

  }


  return copy;

}



/* ==========================================
   QUESTION DATABASE
========================================== */

function getAllQuestions() {

  // First use the new Master Question Bank
  if (
    window.AM_MASTER_BANK &&
    Array.isArray(window.AM_MASTER_BANK.mcqs) &&
    window.AM_MASTER_BANK.mcqs.length > 0
  ) {

    return window.AM_MASTER_BANK.mcqs.map((q) => ({
      id: `master-${q.id}`,
      chapter: q.chapter,
      chapterTitle:
        q.chapter === 1
          ? "Anatomy & Physiology"
          : q.chapter === 2
          ? "Basic Chemistry"
          : q.chapter === 3
          ? "Cells & Microscopes"
          : q.chapter === 4
          ? "Cell Transport"
          : `Chapter ${q.chapter}`,

      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation || "",
      level: q.level || "CORE"
    }));

  }


  // Fallback to the old chapters.js bank
  if (!window.AM_CHAPTERS) {
    return [];
  }


  return AM_CHAPTERS.flatMap((chapter) => {

    return chapter.mcq.map((question, index) => ({

      id: `c${chapter.id}-${index + 1}`,

      chapter: chapter.id,

      chapterTitle: chapter.title,

      question: question[0],

      options: question[1],

      correct: question[2],

      explanation: question[3],

      level: question[4] || "CORE"

    }));

  });

}

function prepareQuestions(
  questions
) {

  return shuffle(
    questions
  )
  .map(
    (question) => {

      const options =
        question.options
          .map(
            (
              text,
              index
            ) => ({

              text,

              correct:
                index ===
                question.correct

            })
          );


      const shuffledOptions =
        shuffle(options);


      return {

        ...question,

        shuffledOptions,

        correctIndex:

          shuffledOptions
            .findIndex(
              (option) =>
                option.correct
            )

      };

    }
  );

}



/* ==========================================
   HOME
========================================== */

function renderHome() {

  if (
    !window.AM_CHAPTERS
  ) {

    app.innerHTML = `

      <article class="panel">

        Chapter data failed
        to load.

      </article>

    `;

    return;

  }


  app.innerHTML =

    heading(

      "STUDY COMMAND CENTER",

      "Choose your next study session",

      "All learning tools are connected to the same progress system."

    )

    +

    `

    <div class="grid">


      ${AM_CHAPTERS
        .map(
          (chapter) => `


        <article
          class="card"
          onclick="
            openNote(
              ${chapter.id}
            )
          "
        >


          <small>

            CHAPTER
            ${chapter.id}

          </small>


          <h3>

            ${chapter.title}

          </h3>


          <p>

            ${chapter.subtitle}

          </p>


          <p>

            ${chapter.notes
              .slice(0,3)
              .map(
                (note) =>
                  note[0]
              )
              .join(" • ")
            }

          </p>


        </article>


      `
        )
        .join("")}


    </div>

    `;

}



/* ==========================================
   NOTES
========================================== */

function renderNotesHome() {

  openNote(1);

}



function openNote(id) {

  const chapter =
    AM_CHAPTERS.find(
      (chapter) =>
        chapter.id === id
    );


  if (!chapter) {
    return;
  }


  app.innerHTML =

    heading(

      "COMPLETE NOTES",

      `Chapter ${id} — ${chapter.title}`,

      "High-yield notes with exam keys."

    )

    +

    `


    <div class="chips">


      ${AM_CHAPTERS
        .map(
          (
            chapterItem
          ) => `


        <button

          class="
            chip
            ${
              chapterItem.id === id
                ? "active"
                : ""
            }
          "

          onclick="
            openNote(
              ${chapterItem.id}
            )
          "
        >

          Chapter
          ${chapterItem.id}

        </button>
 

      `
        )
        .join("")}


    </div>


    <article
      class="panel note"
    >


      ${chapter.notes
        .map(
          (note) => `


        <h3>
          ${note[0]}
        </h3>


        <p>
          ${note[1]}
        </p>


        <div
          class="exam-key"
        >

          <b>
            EXAM KEY:
          </b>

          ${note[2]}

        </div>


      `
        )
        .join("")}


    </article>

    `;

}



/* ==========================================
   FLASHCARDS
========================================== */

function renderFlashHome() {

  app.innerHTML =

    heading(

      "ACTIVE RECALL",

      "Flashcard Decks",

      "Every deck is shuffled, timed and can be repeated."

    )

    +

    `

    <div class="grid">


      ${AM_CHAPTERS
        .map(
          (chapter) => `


        <article

          class="card"

          onclick="
            startFlash(
              ${chapter.id}
            )
          "
        >


          <small>

            ${chapter.flash.length}
            CARDS

          </small>


          <h3>

            Chapter
            ${chapter.id}

          </h3>


          <p>

            ${chapter.title}

          </p>


        </article>


      `
        )
        .join("")}


    </div>

    `;

}



function startFlash(id) {

  const chapter =
    AM_CHAPTERS.find(
      (chapter) =>
        chapter.id === id
    );


  if (!chapter) {
    return;
  }


  currentFlash = {

    id,

    title:
      `Chapter ${id} — ${chapter.title}`,

    cards:
      shuffle(
        chapter.flash
      ),

    index:
      0,

    startedAt:
      Date.now(),

    ratings: {

      again: 0,

      learning: 0,

      mastered: 0

    }

  };


  renderFlashCard();

}



function renderFlashCard() {

  const card =
    currentFlash.cards[
      currentFlash.index
    ];


  const colours = [

    ["#162a48","#6386ff"],

    ["#14352e","#55e1bb"],

    ["#3a2818","#ffb45e"],

    ["#311d3e","#c27cff"],

    ["#15333e","#55c8ff"],

    ["#361d27","#ff7ca2"]

  ];


  const colour =
    colours[
      currentFlash.index %
      colours.length
    ];


  const elapsed =
    Math.round(
      (
        Date.now()
        -
        currentFlash.startedAt
      ) / 1000
    );


  app.innerHTML =

    heading(

      "FLASHCARD SESSION",

      currentFlash.title,

      "Reveal the answer before rating yourself."

    )

    +

    `


    <div class="timerbar">

      <span>

        Card
        ${currentFlash.index + 1}

        /

        ${currentFlash.cards.length}

      </span>


      <strong>
        ${formatTime(elapsed)}
      </strong>

    </div>


    <div class="progress">

      <span

        style="
          width:
          ${
            (
              (
                currentFlash.index
                + 1
              )
              /
              currentFlash.cards.length
            )
            * 100
          }%
        "

      >
      </span>

    </div>


    <div

      class="flash"

      style="
        background:
        linear-gradient(
          145deg,
          ${colour[0]},
          #07111d
        );

        border-color:
        ${colour[1]}66;
      "

    >


      <p class="eyebrow">

        CARD
        ${currentFlash.index + 1}

      </p>


      <h3>
        ${card[0]}
      </h3>


      <div
        id="flashAnswer"
        class="flashAnswer"
      >

        ${card[1]}

      </div>


      <div
        id="flashExplain"
        class="flashExplain"
      >

        ${card[2] || ""}

      </div>


    </div>


    <div class="actions">


      <button
        class="primary"
        onclick="
          revealFlash()
        "
      >
        Reveal Answer
      </button>


      <button
        class="danger"
        onclick="
          rateFlash('again')
        "
      >
        Again
      </button>


      <button
        class="secondary"
        onclick="
          rateFlash('learning')
        "
      >
        Learning
      </button>


      <button
        class="primary"
        onclick="
          rateFlash('mastered')
        "
      >
        Mastered
      </button>


    </div>

    `;

}



function revealFlash() {

  $("flashAnswer")
    .style.display =
    "block";


  $("flashExplain")
    .style.display =
    "block";

}



function rateFlash(
  rating
) {

  currentFlash
    .ratings[rating]
    += 1;


  if (
    currentFlash.index
    <
    currentFlash.cards.length - 1
  ) {

    currentFlash.index
      += 1;


    renderFlashCard();

    return;

  }


  finishFlash();

}



function finishFlash() {

  const seconds =
    Math.round(
      (
        Date.now()
        -
        currentFlash.startedAt
      ) / 1000
    );


  state.flashAttempts.push({

    title:
      currentFlash.title,

    date:
      new Date()
        .toISOString(),

    seconds,

    total:
      currentFlash.cards.length,

    ...currentFlash.ratings

  });


  save();


  app.innerHTML =

    heading(

      "DECK COMPLETE",

      "Flashcard Result",

      "This study session is saved."

    )

    +

    `


    <article
      class="result glass"
    >


      <div class="resultScore">

        ${formatTime(seconds)}

      </div>


      <div class="resultGrid">


        <div>

          Total

          <br>

          <b>
            ${currentFlash.cards.length}
          </b>

        </div>


        <div>

          Mastered

          <br>

          <b>
            ${currentFlash.ratings.mastered}
          </b>

        </div>


        <div>

          Learning

          <br>

          <b>
            ${currentFlash.ratings.learning}
          </b>

        </div>


        <div>

          Again

          <br>

          <b>
            ${currentFlash.ratings.again}
          </b>

        </div>


        <div>

          Avg / Card

          <br>

          <b>

            ${
              Math.round(
                seconds /
                currentFlash.cards.length
              )
            }s

          </b>

        </div>


      </div>


      <div class="actions">


        <button
          class="primary"
          onclick="
            startFlash(
              ${currentFlash.id}
            )
          "
        >

          Resit Full Deck

        </button>


        <button
          class="secondary"
          onclick="
            renderFlashHome()
          "
        >

          Back to Decks

        </button>


      </div>


    </article>

    `;

}



/* ==========================================
   QUESTION BANK
========================================== */

function renderQuestionBank() {

  const questions = getAllQuestions();


  const chapterInfo = [

    {
      id: 1,
      title: "Anatomy & Physiology"
    },

    {
      id: 2,
      title: "Basic Chemistry"
    },

    {
      id: 3,
      title: "Cells & Microscopes"
    },

    {
      id: 4,
      title: "Cell Transport"
    }

  ];


  app.innerHTML =

    heading(
      "MASTER QUESTION BANK",
      "Question Bank",
      "Question order and answer positions shuffle every new attempt."
    )

    +

    `

    <div class="grid">


      <article
        class="card"
        onclick="
          startQuiz(
            getAllQuestions(),
            'Master Question Bank — All Chapters',
            true,
            'bank'
          )
        "
      >

        <small>
          ${questions.length} QUESTIONS
        </small>

        <h3>
          All Chapters
        </h3>

        <p>
          Complete mixed Chapter 1–4 practice.
        </p>

      </article>


      ${chapterInfo.map((chapter) => {

        const count =
          questions.filter(
            q => q.chapter === chapter.id
          ).length;


        return `

          <article
            class="card"
            onclick="
              startChapterBank(
                ${chapter.id}
              )
            "
          >

            <small>
              ${count} QUESTIONS
            </small>

            <h3>
              Chapter ${chapter.id}
            </h3>

            <p>
              ${chapter.title}
            </p>

          </article>

        `;

      }).join("")}


    </div>

    `;

}


function startChapterBank(
  id
) {

  const questions =

    getAllQuestions()
      .filter(
        (question) =>
          question.chapter === id
      );


  startQuiz(

    questions,

    `Chapter ${id} Question Bank`,

    true,

    "bank"

  );

}



/* ==========================================
   QUIZ ENGINE
========================================== */

function startQuiz(

  questions,

  title,

  instantFeedback = true,

  source = "bank",

  minutes = null

) {

  if (!questions.length) {

    app.innerHTML = `

      <article class="panel">

        No questions available.

      </article>

    `;

    return;

  }


  clearInterval(
    examInterval
  );


  currentQuiz = {

    title,

    source,

    instantFeedback,

    questions:
      prepareQuestions(
        questions
      ),

    index:
      0,

    startedAt:
      Date.now(),

    questionStartedAt:
      Date.now(),

    answers:
      [],

    minutes,

    deadline:

      minutes

        ? Date.now()
          + minutes * 60000

        : null

  };


  renderQuizQuestion();


  if (minutes) {

    examInterval =
      setInterval(
        () => {

          if (!currentQuiz) {
            return;
          }


          if (
            Date.now()
            >=
            currentQuiz.deadline
          ) {

            clearInterval(
              examInterval
            );


            finishQuiz();

          } else {

            updateQuizTimer();

          }

        },
        1000
      );

  }

}



function updateQuizTimer() {

  const timer =
    $("sessionTimer");


  if (!timer) {
    return;
  }


  if (
    currentQuiz.deadline
  ) {

    timer.textContent =
      formatTime(

        Math.max(

          0,

          Math.round(
            (
              currentQuiz.deadline
              -
              Date.now()
            ) / 1000
          )

        )

      );

  } else {

    timer.textContent =
      formatTime(

        Math.round(
          (
            Date.now()
            -
            currentQuiz.startedAt
          ) / 1000
        )

      );

  }

}



function renderQuizQuestion() {

  const question =
    currentQuiz.questions[
      currentQuiz.index
    ];


  const answer =
    currentQuiz.answers[
      currentQuiz.index
    ];


  const sessionTime =

    currentQuiz.deadline

      ? Math.max(
          0,
          Math.round(
            (
              currentQuiz.deadline
              -
              Date.now()
            ) / 1000
          )
        )

      : Math.round(
          (
            Date.now()
            -
            currentQuiz.startedAt
          ) / 1000
        );


  app.innerHTML =

    heading(

      currentQuiz.instantFeedback
        ? "LIVE PRACTICE"
        : "TIMED MOCK EXAM",

      currentQuiz.title,

      currentQuiz.instantFeedback
        ? "Correct answer and explanation appear immediately."
        : "Feedback is hidden until Submit."

    )

    +

    `


    <div class="timerbar">


      <span>

        Question

        ${currentQuiz.index + 1}

        /

        ${currentQuiz.questions.length}

      </span>


      <strong
        id="sessionTimer"
      >

        ${formatTime(sessionTime)}

      </strong>


    </div>


    <div class="progress">

      <span

        style="
          width:
          ${
            (
              (
                currentQuiz.index
                + 1
              )
              /
              currentQuiz.questions.length
            )
            * 100
          }%
        "

      >
      </span>

    </div>


    <article
      class="panel quiz"
    >


      <p class="eyebrow">

        CHAPTER
        ${question.chapter}

        •

        ${question.level}

      </p>


      <h3>

        ${question.question}

      </h3>


      ${question
        .shuffledOptions
        .map(
          (
            option,
            index
          ) => `


        <button

          class="
            option
            ${
              answer
              &&
              answer.choice
              === index

                ? "selected"

                : ""
            }
          "

          onclick="
            chooseAnswer(
              ${index}
            )
          "
        >


          ${
            String.fromCharCode(
              65 + index
            )
          }.

          ${option.text}


        </button>


      `
        )
        .join("")}


      <div
        class="feedback"
        id="feedback"
      >
      </div>


      <div class="actions">


        <button

          class="primary"

          id="nextButton"

          style="
            display:
            ${
              answer
                ? "inline-block"
                : "none"
            }
          "

          onclick="
            nextQuizQuestion()
          "
        >


          ${
            currentQuiz.index
            ===
            currentQuiz.questions.length - 1

              ? "Submit"

              : "Next Question"
          }


        </button>


      </div>


    </article>

    `;

}



function chooseAnswer(
  choice
) {

  if (
    currentQuiz.answers[
      currentQuiz.index
    ]
  ) {

    return;

  }


  const question =
    currentQuiz.questions[
      currentQuiz.index
    ];


  const seconds =
    Math.round(
      (
        Date.now()
        -
        currentQuiz.questionStartedAt
      ) / 1000
    );


  const correct =
    choice ===
    question.correctIndex;


  currentQuiz.answers[
    currentQuiz.index
  ] = {

    choice,

    correct,

    seconds

  };


  state.answered += 1;


  if (correct) {

    state.correct += 1;

  } else {

    const exists =
      state.mistakes
        .some(
          (mistake) =>
            mistake.id
            ===
            question.id 
        );


    if (!exists) {

      state.mistakes.push({

  id:
    question.id,

  source:
    currentQuiz.source || "quiz",

  title:
    currentQuiz.title || "Quiz",

  chapter:
    question.chapter,

  chapterTitle:
    question.chapterTitle || "",

  question:
    question.question,

  options:
    question.shuffledOptions.map(
      (option) => option.text
    ),

  correctIndex:
    question.correctIndex,

  correct:
    question
      .shuffledOptions[
        question.correctIndex
      ]
      .text,

  selectedIndex:
    choice,

  selected:
    question
      .shuffledOptions[
        choice
      ]
      .text,

  explanation:
    question.explanation || "",

  level:
    question.level || "REVIEW"

});

    }

  }


  if (
    currentQuiz.instantFeedback
  ) {

    document
      .querySelectorAll(
        ".option"
      )
      .forEach(
        (
          button,
          index
        ) => {

          if (
            index
            ===
            question.correctIndex
          ) {

            button
              .classList
              .add("correct");

          } else if (
            index === choice
          ) {

            button
              .classList
              .add("wrong");

          }

        }
      );


    $("feedback")
      .style.display =
      "block";


    $("feedback")
      .innerHTML = `

        <b>

          ${
            correct
              ? "✓ Correct"
              : "✕ Review this concept"
          }

        </b>

        <br>

        ${question.explanation}

        <br>

        <small>

          Time:
          ${seconds}s

        </small>

      `;

  }


  $("nextButton")
    .style.display =
    "inline-block";


  save();

  renderStats();

}



function nextQuizQuestion() {

  if (
    currentQuiz.index
    <
    currentQuiz.questions.length - 1
  ) {

    currentQuiz.index += 1;

    currentQuiz.questionStartedAt =
      Date.now();


    renderQuizQuestion();

    return;

  }


  finishQuiz();

}



function finishQuiz() {

  clearInterval(
    examInterval
  );


  if (!currentQuiz) {
    return;
  }


  const quiz =
    currentQuiz;


  const seconds =
    Math.round(
      (
        Date.now()
        -
        quiz.startedAt
      ) / 1000
    );


  const answered =
    quiz.answers
      .filter(Boolean)
      .length;


  const correct =
    quiz.answers
      .filter(
        (answer) =>
          answer
          &&
          answer.correct
      )
      .length;


  const total =
    quiz.questions.length;


  const score =
    Math.round(
      (
        correct /
        total
      )
      * 100
    );


  state.attempts.push({

    title:
      quiz.title,

    date:
      new Date()
        .toISOString(),

    source:
      quiz.source,

    seconds,

    correct,

    answered,

    total,

    score

  });


  save();


  app.innerHTML =

    heading(

      "ATTEMPT COMPLETE",

      quiz.title,

      "Full answer review is now unlocked."

    )

    +

    `


    <article
      class="result glass"
    >


      <div class="resultScore">

        ${score}%

      </div>


      <div class="resultGrid">


        <div>

          Correct

          <br>

          <b>
            ${correct}
          </b>

        </div>


        <div>

          Incorrect

          <br>

          <b>
            ${answered - correct}
          </b>

        </div>


        <div>

          Unanswered

          <br>

          <b>
            ${total - answered}
          </b>

        </div>


        <div>

          Total Time

          <br>

          <b>

            ${formatTime(seconds)}

          </b>

        </div>


        <div>

          Avg / Q

          <br>

          <b>

            ${
              answered
              ?
              Math.round(
                seconds /
                answered
              )
              :
              0
            }s

          </b>

        </div>


      </div>


      <div class="actions">


        <button
          class="primary"
          id="resitButton"
        >

          Resit Full Set

        </button>


        <button
          class="secondary"
          id="retryButton"
        >

          Retry Mistakes

        </button>


      </div>


      <h3>
        Full Answer Review
      </h3>


      ${quiz.questions
        .map(
          (
            question,
            index
          ) => {

            const answer =
              quiz.answers[index];


            return `


            <div

              class="
                review
                ${
                  answer
                  &&
                  answer.correct

                    ? "ok"

                    : "bad"
                }
              "

            >


              <b>

                Q${index + 1}.

                ${question.question}

              </b>


              <p>


                Your answer:

                ${
                  answer

                    ?
                    question
                      .shuffledOptions[
                        answer.choice
                      ]
                      .text

                    :
                    "Unanswered"
                }


                <br>


                Correct:

                ${
                  question
                    .shuffledOptions[
                      question.correctIndex
                    ]
                    .text
                }


                <br>


                ${question.explanation}


              </p>


            </div>


          `;

          }
        )
        .join("")}


    </article>

    `;


  $("resitButton")
    .onclick =
    () => {

      const questions =
        quiz.questions
          .map(
            (question) => ({

              id:
                question.id,

              chapter:
                question.chapter,

              question:
                question.question,

              options:
                question
                  .shuffledOptions
                  .map(
                    (option) =>
                      option.text
                  ),

              correct:
                question.correctIndex,

              explanation:
                question.explanation,

              level:
                question.level

            })
          );


      startQuiz(

        questions,

        quiz.title,

        quiz.instantFeedback,

        quiz.source,

        quiz.minutes

      );

    };


  $("retryButton")
    .onclick =
    () => {

      const missed =
        quiz.questions
          .filter(
            (
              question,
              index
            ) => {

              const answer =
                quiz.answers[index];


              return (
                !answer
                ||
                !answer.correct
              );

            }
          )
          .map(
            (question) => ({

              id:
                question.id,

              chapter:
                question.chapter,

              question:
                question.question,

              options:
                question
                  .shuffledOptions
                  .map(
                    (option) =>
                      option.text
                  ),

              correct:
                question.correctIndex,

              explanation:
                question.explanation,

              level:
                question.level

            })
          );


      if (
        missed.length
      ) {

        startQuiz(

          missed,

          "Retry Missed Questions",

          true,

          quiz.source

        );

      }

    };

}



/* ==========================================
   SHORT ANSWERS
========================================== */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderShortAnswers() {
  const shortAnswers =
    window.AM_MASTER_BANK &&
    Array.isArray(window.AM_MASTER_BANK.shortAnswers)
      ? window.AM_MASTER_BANK.shortAnswers
      : [];

  const total = shortAnswers.length;

  const chapterTitles = {
    1: "Anatomy & Physiology",
    2: "Basic Chemistry",
    3: "Cells & Microscopes",
    4: "Cell Transport"
  };

  const chapterCards = [1, 2, 3, 4]
    .map((chapterNumber) => {
      const count = shortAnswers.filter(
        (item) => Number(item.chapter) === chapterNumber
      ).length;

      return `
        <article
          class="card"
          style="cursor:pointer"
          onclick="openShortAnswerChapter(${chapterNumber})"
        >
          <small>${count} SHORT ANSWERS</small>

          <h3>Chapter ${chapterNumber}</h3>

          <p>${chapterTitles[chapterNumber]}</p>

          <button
            class="primary"
            onclick="event.stopPropagation(); openShortAnswerChapter(${chapterNumber})"
          >
            Start Chapter
          </button>
        </article>
      `;
    })
    .join("");

  app.innerHTML =
    heading(
      "WRITTEN RECALL",
      "Short Answers",
      "Write your answer first, then reveal the model answer and marking points."
    ) +
    `
      <section class="stats">
        <div class="stat glass">
          <small>Total Short Answers</small>
          <strong>${total}</strong>
        </div>

        <div class="stat glass">
          <small>Chapters</small>
          <strong>4</strong>
        </div>
      </section>

      <section class="grid">
        <article
          class="card"
          style="cursor:pointer"
          onclick="openShortAnswerChapter(0)"
        >
          <small>${total} SHORT ANSWERS</small>

          <h3>All Chapters</h3>

          <p>Mixed written-recall practice from Chapters 1–4.</p>

          <button
            class="primary"
            onclick="event.stopPropagation(); openShortAnswerChapter(0)"
          >
            Start All
          </button>
        </article>

        ${chapterCards}
      </section>
    `;
}


function openShortAnswerChapter(chapterNumber) {
  const allShortAnswers =
    window.AM_MASTER_BANK &&
    Array.isArray(window.AM_MASTER_BANK.shortAnswers)
      ? window.AM_MASTER_BANK.shortAnswers
      : [];

  const questions =
    Number(chapterNumber) === 0
      ? [...allShortAnswers]
      : allShortAnswers.filter(
          (item) => Number(item.chapter) === Number(chapterNumber)
        );

  if (!questions.length) {
    app.innerHTML =
      heading(
        "WRITTEN RECALL",
        "No Short Answers Yet",
        "There are no short-answer questions loaded for this chapter."
      ) +
      `
        <button class="primary" onclick="renderShortAnswers()">
          Back to Short Answers
        </button>
      `;
    return;
  }

  let currentIndex = 0;

  function showQuestion() {
    const item = questions[currentIndex];

    const markingPoints = Array.isArray(item.markingPoints)
      ? item.markingPoints
          .map((point) => `<li>${escapeHTML(String(point))}</li>`)
          .join("")
      : "";

    app.innerHTML = `
      <section class="page-head">
        <div>
          <p class="eyebrow">
            SHORT ANSWER ${currentIndex + 1} OF ${questions.length}
          </p>

          <h1>
            ${
              Number(chapterNumber) === 0
                ? "All Chapters"
                : `Chapter ${chapterNumber}`
            }
          </h1>

          <p>
            Write your own answer before revealing the model answer.
          </p>
        </div>
      </section>

      <article class="card">
        <small>
          SA${item.id}
          • Chapter ${item.chapter}
          ${item.marks ? `• ${item.marks} marks` : ""}
        </small>

        <h2 style="margin-top:18px;">
          ${escapeHTML(String(item.question || ""))}
        </h2>

        <div style="margin-top:24px;">
          <label>
            <strong>Your Answer</strong>
          </label>

          <textarea
            id="studentShortAnswer"
            rows="8"
            placeholder="Write your answer here before revealing the model answer..."
            style="
              width:100%;
              margin-top:12px;
              padding:16px;
              border-radius:16px;
              box-sizing:border-box;
              resize:vertical;
              font:inherit;
            "
          ></textarea>
        </div>

        <div style="margin-top:20px;">
          <button
            class="primary"
            id="revealShortAnswerBtn"
          >
            Reveal Model Answer
          </button>
        </div>

        <div
          id="shortAnswerModel"
          style="display:none; margin-top:24px;"
        >
          <div class="card">
            <small>MODEL ANSWER</small>

            <p style="margin-top:12px; line-height:1.7;">
              ${escapeHTML(String(item.modelAnswer || ""))}
            </p>
          </div>

          ${
            markingPoints
              ? `
                <div class="card" style="margin-top:16px;">
                  <small>MARKING POINTS</small>

                  <ul style="line-height:1.8; margin-top:12px;">
                    ${markingPoints}
                  </ul>
                </div>
              `
              : ""
          }
        </div>
      </article>

      <div
        style="
          display:flex;
          gap:12px;
          justify-content:space-between;
          flex-wrap:wrap;
          margin-top:20px;
        "
      >
        <button
          class="secondary"
          id="backShortAnswersBtn"
        >
          Back
        </button>

        <div style="display:flex; gap:12px;">
          <button
            class="secondary"
            id="previousShortAnswerBtn"
            ${currentIndex === 0 ? "disabled" : ""}
          >
            Previous
          </button>

          <button
            class="primary"
            id="nextShortAnswerBtn"
          >
            ${
              currentIndex === questions.length - 1
                ? "Finish"
                : "Next Question"
            }
          </button>
        </div>
      </div>
    `;

    document
      .getElementById("revealShortAnswerBtn")
      .addEventListener("click", () => {
        const model = document.getElementById("shortAnswerModel");
        const button = document.getElementById("revealShortAnswerBtn");

        model.style.display = "block";
        button.textContent = "Model Answer Revealed";
        button.disabled = true;
      });

    document
      .getElementById("backShortAnswersBtn")
      .addEventListener("click", () => {
        renderShortAnswers();
      });

    const previousButton = document.getElementById(
      "previousShortAnswerBtn"
    );

    if (previousButton) {
      previousButton.addEventListener("click", () => {
        if (currentIndex > 0) {
          currentIndex--;
          showQuestion();
        }
      });
    }

    document
      .getElementById("nextShortAnswerBtn")
      .addEventListener("click", () => {
        if (currentIndex < questions.length - 1) {
          currentIndex++;
          showQuestion();
        } else {
          renderShortAnswers();
        }
      });
  }

  showQuestion();
}



function revealModel(
  button
) {

  button
    .parentElement
    .nextElementSibling
    .style.display =
    "block";

}



/* ==========================================
   QUIZZES
========================================== */

function renderQuizzes() {

  if (
    !window.AM_QUIZZES
  ) {

    app.innerHTML = `

      <article class="panel">

        Quiz data failed to load.

      </article>

    `;

    return;

  }


  app.innerHTML =

    heading(

      "COURSE PRACTICE",

      "Quiz Sets",

      "Teacher and revision-style practice."

    )

    +

    `

    <div class="grid">


      ${AM_QUIZZES
        .map(
          (
            quiz,
            index
          ) => `


        <article

          class="card"

          onclick="
            launchQuiz(
              ${index}
            )
          "
        >


          <small>

            ${quiz.mode.toUpperCase()}

          </small>


          <h3>

            ${quiz.title}

          </h3>


          <p>

            ${
              quiz.chapter

                ? `Chapter ${quiz.chapter}`

                : "Mixed Chapters 1–4"
            }

          </p>


        </article>


      `
        )
        .join("")}


    </div>

    `;

}



function launchQuiz(index) {

  const quiz = AM_QUIZZES[index];

  let questions;

  // If the quiz has its own teacher questions, use them.
  if (
    Array.isArray(quiz.questions) &&
    quiz.questions.length > 0
  ) {

    questions = quiz.questions.map((q) => ({
      ...q,
      chapter: quiz.chapter || 0
    }));

  }

  // Otherwise use questions from the master question bank.
  else if (quiz.chapter) {

    questions = getAllQuestions().filter(
      (question) =>
        Number(question.chapter) === Number(quiz.chapter)
    );

  }

  // Mixed revision quiz.
  else {

    questions = getAllQuestions();

  }


  if (!questions.length) {

    alert("No questions are available for this quiz yet.");

    return;

  }


  startQuiz(
    questions,
    quiz.title,
    true,
    "quizzes"
  );

}



/* ==========================================
   MOCKS
========================================== */

function renderMocks() {

  if (
    !window.AM_MOCKS
  ) {

    app.innerHTML = `

      <article class="panel">

        Mock data failed to load.

      </article>

    `;

    return;

  }


  app.innerHTML =

    heading(

      "EXAM CENTRE",

      "Mock Exams",

      "Timed simulation with full review after Submit."

    )

    +

    `

    <div class="grid">


      ${AM_MOCKS
        .map(
          (
            mock,
            index
          ) => `


        <article

          class="card"

          onclick="
            launchMock(
              ${index}
            )
          "
        >


          <small>

            ${mock.minutes}
            MIN

          </small>


          <h3>

            ${mock.title}

          </h3>


          <p>

            Timed Chapter 1–4 exam simulation.

          </p>


        </article>


      `
        )
        .join("")}


    </div>

    `;

}



function launchMock(index) {

  const mock = AM_MOCKS[index];

  if (!mock) {
    alert("Mock exam could not be loaded.");
    return;
  }

  // New full 30-question mock format
  if (
    Array.isArray(mock.mcqs) &&
    Array.isArray(mock.shortAnswers)
  ) {
    startFullMockExam(mock);
    return;
  }

  // Fallback for old mocks
  const pool = shuffle(getAllQuestions());

  const questions = pool.slice(
    0,
    Math.min(20, pool.length)
  );

  startQuiz(
    questions,
    mock.title,
    false,
    "mocks",
    mock.minutes
  );
}

let fullMockState = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function startFullMockExam(mock) {

  fullMockState = {
    mock: mock,
    mcqs: shuffle([...mock.mcqs]),
    shortAnswers: [...mock.shortAnswers],
    mcqAnswers: {},
    shortResponses: {},
    currentSection: "mcq",
    submitted: false,
    startedAt: Date.now()
  };

  renderFullMockExam();
}


function renderFullMockExam() {

  const state = fullMockState;

  if (!state) return;

  const mock = state.mock;

  app.innerHTML =
    heading(
      "EXAM CENTRE",
      mock.title,
      "30 Questions • 20 MCQ + 10 Short Answers"
    )
    +
    `
    <article class="panel">

      <div style="
        display:flex;
        justify-content:space-between;
        gap:15px;
        flex-wrap:wrap;
        margin-bottom:24px;
      ">

        <div>
          <strong>30 Questions</strong><br>
          <small>20 MCQ + 10 Short Answers</small>
        </div>

        <div>
          <strong>${mock.minutes || 30} Minutes</strong><br>
          <small>Chapters 1–4</small>
        </div>

      </div>


      <h2>PART A — Multiple Choice</h2>

      ${state.mcqs.map((q, index) => `

        <div class="card" style="margin-bottom:20px;">

          <small>QUESTION ${index + 1} / 30</small>

          <h3>${escapeHtml(q.question)}</h3>

          <div>

            ${q.options.map((option, optionIndex) => `

              <label
                style="
                  display:block;
                  padding:14px;
                  margin:8px 0;
                  border:1px solid var(--line);
                  border-radius:12px;
                  cursor:pointer;
                "
              >

                <input
                  type="radio"
                  name="mock_mcq_${q.id}"
                  value="${optionIndex}"
                  ${Number(state.mcqAnswers[q.id]) === optionIndex ? "checked" : ""}
                  onchange="saveMockMCQ(${q.id}, ${optionIndex})"
                >

                ${String.fromCharCode(65 + optionIndex)}.
                ${escapeHtml(option)}

              </label>

            `).join("")}

          </div>

        </div>

      `).join("")}



      <h2 style="margin-top:40px;">
        PART B — Short Answers
      </h2>

      ${state.shortAnswers.map((q, index) => `

        <div class="card" style="margin-bottom:20px;">

          <small>
            QUESTION ${index + 21} / 30
            • ${q.marks || ""} MARKS
          </small>

          <h3>${escapeHtml(q.question)}</h3>

          <textarea
            rows="5"
            placeholder="Write your answer here..."
            oninput="saveMockShortAnswer(${q.id}, this.value)"
            style="
              width:100%;
              box-sizing:border-box;
              padding:15px;
              margin-top:12px;
              border-radius:12px;
              border:1px solid var(--line);
              background:var(--panel);
              color:inherit;
              font:inherit;
            "
          >${escapeHtml(state.shortResponses[q.id] || "")}</textarea>

        </div>

      `).join("")}


      <button
        class="primary"
        onclick="submitFullMockExam()"
        style="
          width:100%;
          margin-top:25px;
          padding:18px;
          font-size:18px;
        "
      >
        Submit Full Mock Exam
      </button>

    </article>
    `;
}


function saveMockMCQ(questionId, answerIndex) {

  if (!fullMockState) return;

  fullMockState.mcqAnswers[questionId] =
    Number(answerIndex);
}


function saveMockShortAnswer(questionId, value) {

  if (!fullMockState) return;

  fullMockState.shortResponses[questionId] =
    value;
}


function saveMockMistake(mistake) {

  const exists = state.mistakes.some(
    (item) => item.id === mistake.id
  );

  if (!exists) {
    state.mistakes.push(mistake);
  }

  save();
}
function submitFullMockExam() {

  const exam = fullMockState;

  if (!exam) {
    return;
  }

  let mcqCorrect = 0;
  let mcqAnswered = 0;


  exam.mcqs.forEach((q) => {

    const rawSelected =
      exam.mcqAnswers[q.id];

    const hasAnswer =
      rawSelected !== undefined &&
      rawSelected !== null &&
      rawSelected !== "";

    const selected =
      hasAnswer
        ? Number(rawSelected)
        : null;

    const correct =
      Number(q.correct);


    if (hasAnswer) {
      mcqAnswered++;
      state.answered++;
    }


    if (
      hasAnswer &&
      selected === correct
    ) {

      mcqCorrect++;
      state.correct++;

    } else {

      const correctText =
        Array.isArray(q.options)
          ? q.options[correct]
          : "";


      const selectedText =
        hasAnswer &&
        Array.isArray(q.options)
          ? q.options[selected]
          : "Not answered";


      saveMockMistake({

  id:
    `mock-${exam.mock.id}-${q.id}`,

  originalId:
    q.id,

  source:
    "Mock Exam",

  title:
    exam.mock.title,

  chapter:
    q.chapter || "1–4",

  question:
    q.question,

  options:
    Array.isArray(q.options)
      ? [...q.options]
      : [],

  selected:
    selectedText,

  selectedIndex:
    selected,

  correct:
    correctText,

  correctIndex:
    correct,

  explanation:
    q.explanation || "",

  level:
    q.level || "MOCK REVIEW"

});

    }

  });


  const mcqPercent =
    exam.mcqs.length
      ? Math.round(
          (
            mcqCorrect /
            exam.mcqs.length
          ) * 100
        )
      : 0;


  const seconds =
    Math.round(
      (
        Date.now() -
        exam.startedAt
      ) / 1000
    );


  state.attempts.push({

    title:
      exam.mock.title,

    date:
      new Date().toISOString(),

    source:
      "mocks",

    seconds,

    correct:
      mcqCorrect,

    answered:
      mcqAnswered,

    total:
      exam.mcqs.length,

    score:
      mcqPercent

  });


  exam.submitted = true;

  save();

  renderStats();


  app.innerHTML =

    heading(

      "MOCK EXAM COMPLETE",

      exam.mock.title,

      "MCQs are automatically marked. Compare your written answers with the model answers below."

    )

    +

    `

    <article class="result glass">

      <div class="resultScore">
        ${mcqPercent}%
      </div>


      <div class="resultGrid">

        <div>
          MCQ Correct
          <br>
          <b>
            ${mcqCorrect}/${exam.mcqs.length}
          </b>
        </div>


        <div>
          Incorrect
          <br>
          <b>
            ${exam.mcqs.length - mcqCorrect}
          </b>
        </div>


        <div>
          MCQ Answered
          <br>
          <b>
            ${mcqAnswered}/${exam.mcqs.length}
          </b>
        </div>


        <div>
          Short Answers
          <br>
          <b>
            ${exam.shortAnswers.length}
          </b>
        </div>


        <div>
          Total Time
          <br>
          <b>
            ${formatTime(seconds)}
          </b>
        </div>

      </div>


      <h3 style="margin-top:32px;">
        PART A — MCQ Review
      </h3>


      ${exam.mcqs.map((q, index) => {

        const rawSelected =
          exam.mcqAnswers[q.id];

        const hasAnswer =
          rawSelected !== undefined &&
          rawSelected !== null &&
          rawSelected !== "";

        const selected =
          hasAnswer
            ? Number(rawSelected)
            : null;

        const correct =
          Number(q.correct);

        const isCorrect =
          hasAnswer &&
          selected === correct;


        return `

          <div
            class="
              review
              ${isCorrect ? "ok" : "bad"}
            "
          >

            <b>
              Question ${index + 1}.
              ${escapeHtml(q.question)}
            </b>

            <p>

              Your answer:

              ${
                hasAnswer
                  ? escapeHtml(
                      q.options[selected] || ""
                    )
                  : "Not answered"
              }

              <br>

              Correct:

              ${escapeHtml(
                q.options[correct] || ""
              )}

              <br>

              ${escapeHtml(
                q.explanation || ""
              )}

            </p>

          </div>

        `;

      }).join("")}


      <h3 style="margin-top:32px;">
        PART B — Short Answer Review
      </h3>


      ${exam.shortAnswers.map((q, index) => {

        const studentAnswer =
          exam.shortResponses[q.id] || "";

        return `

          <div class="review">

            <small>
              QUESTION ${index + 21}
              • ${q.marks || ""} MARKS
            </small>

            <h4>
              ${escapeHtml(q.question)}
            </h4>


            <p>

              <b>Your answer:</b>

              <br>

              ${
                studentAnswer.trim()
                  ? escapeHtml(studentAnswer)
                  : "Not answered"
              }

            </p>


            <p>

              <b>Model answer:</b>

              <br>

              ${escapeHtml(
                q.modelAnswer || ""
              )}

            </p>

          </div>

        `;

      }).join("")}


      <div
        class="actions"
        style="margin-top:30px;"
      >

        <button
          class="primary"
          onclick="renderMocks()"
        >
          Back to Mock Exams
        </button>


        <button
          class="secondary"
          onclick="renderMistakes()"
        >
          Review Mistakes
        </button>

      </div>

    </article>

    `;

}

/* ==========================================
   MISTAKE VAULT
========================================== */

function renderMistakes() {

  app.innerHTML =

    heading(

      "TARGETED RECOVERY",

      "Mistake Vault",

      "Incorrect answers are automatically saved."

    )

    +

    (

      state.mistakes.length

      ?

      `


      <div class="actions">


        <button
          class="primary"
          onclick="
            retryMistakes()
          "
        >

          Retry All Mistakes

        </button>


        <button
          class="danger"
          onclick="
            clearMistakes()
          "
        >

          Clear Vault

        </button>


      </div>


      ${state.mistakes
        .map(
          (mistake) => `


        <article
          class="mistake"
        >


          <small>

            CHAPTER
            ${mistake.chapter}

          </small>


          <h4>

            ${mistake.question}

          </h4>


          <p>

            Correct:

            ${mistake.correct}

          </p>


          <p class="muted">

            ${mistake.explanation}

          </p>


        </article>


      `
        )
        .join("")}


      `

      :

      `

      <article class="panel">

        No mistakes waiting 🎯

      </article>

      `

    );

}



function retryMistakes() {

  if (
    !Array.isArray(state.mistakes) ||
    state.mistakes.length === 0
  ) {
    alert("There are no mistakes to retry.");
    return;
  }

  const masterQuestions = getAllQuestions();

  const mockQuestions = [];

  if (Array.isArray(window.AM_MOCKS)) {

    window.AM_MOCKS.forEach((mock) => {

      if (!Array.isArray(mock.mcqs)) {
        return;
      }

      mock.mcqs.forEach((q) => {

        mockQuestions.push({
          mockId: mock.id,
          mockTitle: mock.title,
          question: q
        });

      });

    });

  }

  const retryQuestions = state.mistakes
    .map((mistake) => {

      /* ===============================
         NORMAL QUESTION BANK / QUIZ
      =============================== */

      const normalQuestion = masterQuestions.find(
        (q) => q.id === mistake.id
      );

      if (normalQuestion) {

        return {
          id: normalQuestion.id,
          chapter: normalQuestion.chapter,
          chapterTitle: normalQuestion.chapterTitle,
          question: normalQuestion.question,
          options: [...normalQuestion.options],
          correct: Number(normalQuestion.correct),
          explanation: normalQuestion.explanation || "",
          level: normalQuestion.level || "REVIEW"
        };

      }

      /* ===============================
         MOCK MISTAKE WITH SAVED OPTIONS
      =============================== */

      if (
        
        Array.isArray(mistake.options) &&
        mistake.options.length > 1 &&
        Number.isInteger(Number(mistake.correctIndex))
      ) {

        return {
          id: mistake.id,
          chapter: mistake.chapter || "1–4",
          chapterTitle: mistake.title || "Mock Exam",
          question: mistake.question,
          options: [...mistake.options],
          correct: Number(mistake.correctIndex),
          explanation: mistake.explanation || "",
          level: mistake.level || "MOCK MISTAKE REVIEW"
        };

      }

      /* ===============================
         OLD MOCK MISTAKE FORMAT
      =============================== */

      if (mistake.source === "Mock Exam") {

        const original = mockQuestions.find((item) => {

          const generatedId =
            `mock-${item.mockId}-${item.question.id}`;

          return (
            generatedId === mistake.id ||
            item.question.question === mistake.question
          );

        });

        if (
          original &&
          Array.isArray(original.question.options)
        ) {

          return {
            id: mistake.id,
            chapter:
              original.question.chapter ||
              mistake.chapter ||
              "1–4",

            chapterTitle:
              original.mockTitle,

            question:
              original.question.question,

            options:
              [...original.question.options],

            correct:
              Number(original.question.correct),

            explanation:
              original.question.explanation || "",

            level:
              "MOCK MISTAKE REVIEW"
          };

        }

      }

      return null;

    })
    .filter(Boolean);

  if (!retryQuestions.length) {

    alert(
      "No retryable questions were found."
    );

    return;

  }

  startQuiz(
    retryQuestions,
    "Retry All Mistakes",
    true,
    "mistakes"
  );

}

    



function clearMistakes() {

  if (
    !confirm(
      "Clear all saved mistakes?"
    )
  ) {

    return;

  }


  state.mistakes =
    [];


  save();

  renderStats();

  renderMistakes();

}



/* ==========================================
   SCHEDULE
========================================== */

function getTaskMap() {

  try {

    return JSON.parse(

      localStorage.getItem(
        TASKSTORE
      )
      || "{}"

    );

  } catch {

    return {};

  }

}



function renderSchedule() {

  if (
    !window.AM_SCHEDULE
  ) {

    app.innerHTML = `

      <article class="panel">

        Schedule data failed to load.

      </article>

    `;

    return;

  }


  const completed =
    getTaskMap();


  const tasks =
    [...AM_SCHEDULE]
      .sort(
        (a,b) =>
          a.date
            .localeCompare(
              b.date
            )
      );


  app.innerHTML =

    heading(

      "STREAM C",

      "Schedule & Tasks",

      "Mark completed tasks and keep your course timeline organised."

    )

    +

    tasks
      .map(
        (task) => `


      <article

        class="
          task
          glass
          ${
            completed[task.id]
              ? "done"
              : ""
          }
        "

      >


        <div>


          <small>


            ${
              new Date(
                task.date
                +
                "T12:00:00"
              )
              .toLocaleDateString(
                "en-NZ",
                {
                  weekday:
                    "short",

                  day:
                    "numeric",

                  month:
                    "short"
                }
              )
            }


            •

            Week
            ${task.week}


          </small>


          <h4>

            ${task.title}

          </h4>


          <p class="muted">

            ${
              task.stream === "C"

                ?
                "Stream C relevant"

                :
                task.stream === "Other"

                ?
                "Other streams"

                :
                "All streams"
            }

          </p>


        </div>


        <button

          class="
            ${
              completed[task.id]

                ? "secondary"

                : "primary"
            }
          "

          onclick="
            toggleTask(
              '${task.id}'
            )
          "
        >


          ${
            completed[task.id]

              ? "Completed ✓"

              : "Mark Done"
          }


        </button>


      </article>


    `
      )
      .join("");

}



function toggleTask(
  id
) {

  const completed =
    getTaskMap();


  completed[id] =
    !completed[id];


  localStorage.setItem(

    TASKSTORE,

    JSON.stringify(
      completed
    )

  );


  renderSchedule();

  renderPriority();

}



/* ==========================================
   NEXT PRIORITY
========================================== */

function renderPriority() {

  if (
    !window.AM_SCHEDULE
  ) {

    $("priorityTitle")
      .textContent =
      "Schedule unavailable";

    return;

  }


  const completed =
    getTaskMap();


  const today =
    getTodayKey();


  const next =

    AM_SCHEDULE
      .filter(
        (task) =>

          task.date >= today

          &&

          !completed[
            task.id
          ]

          &&

          task.stream
          !==
          "Other"
      )
      .sort(
        (a,b) =>
          a.date
            .localeCompare(
              b.date
            )
      )[0];


  if (!next) {

    $("priorityTitle")
      .textContent =
      "No upcoming tasks";


    $("priorityMeta")
      .textContent =
      "";


    return;

  }


  $("weekLabel")
    .textContent =

    `WEEK ${next.week} • STREAM C`;


  $("priorityTitle")
    .textContent =
    next.title;


  const nextDate =
    new Date(
      next.date
      +
      "T12:00:00"
    );


  const now =
    new Date();


  const days =
    Math.ceil(
      (
        nextDate
        -
        now
      )
      /
      86400000
    );


  $("priorityMeta")
    .textContent =

    `${
      nextDate
        .toLocaleDateString(
          "en-NZ",
          {
            weekday:
              "long",

            day:
              "numeric",

            month:
              "long"
          }
        )
    } • ${
      days <= 0

        ? "Today"

        : days === 1

        ? "Tomorrow"

        : `${days} days`
    }`;

}



/* ==========================================
   PROGRESS
========================================== */

function renderProgress() {

  const attempts =
    [...state.attempts]
      .reverse();


  const flashAttempts =
    [...state.flashAttempts]
      .reverse();


  const bestScore =

    state.attempts.length

      ?
      Math.max(
        ...state.attempts
          .map(
            (attempt) =>
              attempt.score
          )
      )

      :
      0;


  app.innerHTML =

    heading(

      "LEARNING ANALYTICS",

      "Progress History",

      "Scores and study time are saved on this browser."

    )

    +

    `


    <section class="stats">


      <div class="stat glass">

        <small>
          Attempts
        </small>

        <strong>
          ${state.attempts.length}
        </strong>

      </div>


      <div class="stat glass">

        <small>
          Flash Decks
        </small>

        <strong>
          ${state.flashAttempts.length}
        </strong>

      </div>


      <div class="stat glass">

        <small>
          Best Score
        </small>

        <strong>
          ${bestScore}%
        </strong>

      </div>


      <div class="stat glass">

        <small>
          Total Study
        </small>

        <strong>

          ${formatTime(
            state.totalSec
          )}

        </strong>

      </div>


    </section>


    <h3>
      Quiz / Exam Attempts
    </h3>


    ${
      attempts.length

      ?

      attempts
        .map(
          (attempt) => `


        <article class="panel">


          <b>

            ${attempt.title}

          </b>


          <p class="muted">


            ${
              new Date(
                attempt.date
              )
              .toLocaleString(
                "en-NZ"
              )
            }


            •


            ${attempt.score}%


            •


            ${attempt.correct}
            /
            ${attempt.total}


            •


            ${
              formatTime(
                attempt.seconds
              )
            }


          </p>


        </article>


      `
        )
        .join("")

      :

      `

      <article class="panel">

        No completed attempts yet.

      </article>

      `
    }


    <h3>
      Flashcard Attempts
    </h3>


    ${
      flashAttempts.length

      ?

      flashAttempts
        .map(
          (attempt) => `


        <article class="panel">


          <b>

            ${attempt.title}

          </b>


          <p class="muted">


            ${
              new Date(
                attempt.date
              )
              .toLocaleString(
                "en-NZ"
              )
            }


            •


            ${
              formatTime(
                attempt.seconds
              )
            }


            •


            Mastered

            ${attempt.mastered}
            /
            ${attempt.total}


          </p>


        </article>


      `
        )
        .join("")

      :

      `

      <article class="panel">

        No completed flashcard decks yet.

      </article>

      `
    }

    `;

}



/* ==========================================
   WEATHER
========================================== */

function getWeatherDescription(
  code
) {

  const descriptions = {

    0:
      "Clear sky",

    1:
      "Mostly clear",

    2:
      "Partly cloudy",

    3:
      "Cloudy",

    45:
      "Fog",

    48:
      "Fog",

    51:
      "Light drizzle",

    53:
      "Drizzle",

    55:
      "Heavy drizzle",

    61:
      "Light rain",

    63:
      "Rain",

    65:
      "Heavy rain",

    71:
      "Light snow",

    73:
      "Snow",

    75:
      "Heavy snow",

    80:
      "Rain showers",

    81:
      "Rain showers",

    82:
      "Heavy showers",

    95:
      "Thunderstorm",

    96:
      "Thunderstorm",

    99:
      "Thunderstorm"

  };


  return (
    descriptions[code]
    ||
    "Current weather"
  );

}



function applyWeatherTheme(
  temperature,
  code
) {

  document.body
    .classList
    .remove(

      "weather-freezing",

      "weather-cold",

      "weather-cool",

      "weather-mild",

      "weather-warm",

      "weather-hot",

      "weather-rain",

      "weather-clear"

    );


  const rainCodes = [

    51,53,55,

    61,63,65,

    80,81,82,

    95,96,99

  ];


  if (
    rainCodes.includes(
      code
    )
  ) {

    document.body
      .classList
      .add(
        "weather-rain"
      );

    return;

  }


  if (
    code === 0
    ||
    code === 1
  ) {

    document.body
      .classList
      .add(
        "weather-clear"
      );

  }


  if (
    temperature <= 5
  ) {

    document.body
      .classList
      .add(
        "weather-freezing"
      );

  } else if (
    temperature <= 10
  ) {

    document.body
      .classList
      .add(
        "weather-cold"
      );

  } else if (
    temperature <= 17
  ) {

    document.body
      .classList
      .add(
        "weather-cool"
      );

  } else if (
    temperature <= 24
  ) {

    document.body
      .classList
      .add(
        "weather-mild"
      );

  } else if (
    temperature <= 30
  ) {

    document.body
      .classList
      .add(
        "weather-warm"
      );

  } else {

    document.body
      .classList
      .add(
        "weather-hot"
      );

  }

}



async function loadWeather(
  latitude,
  longitude
) {

  try {

    const url =

      "https://api.open-meteo.com/v1/forecast"

      +

      `?latitude=${latitude}`

      +

      `&longitude=${longitude}`

      +

      "&current=temperature_2m,apparent_temperature,weather_code"

      +

      "&timezone=auto";


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        "Weather unavailable"
      );

    }


    const data =
      await response.json();


    const temperature =
      Math.round(
        data.current
          .temperature_2m
      );


    const feelsLike =
      Math.round(
        data.current
          .apparent_temperature
      );


    const code =
      data.current
        .weather_code;


    const condition =
      getWeatherDescription(
        code
      );


    if ($("stWeather")) {

      $("stWeather")
        .textContent =
        `${temperature}°C`;

    }


    if ($("stCondition")) {

      $("stCondition")
        .textContent =
        `${condition} • Feels ${feelsLike}°C`;

    }


    if ($("weatherTop")) {

      $("weatherTop")
        .textContent =
        `${temperature}°C • ${condition}`;

    }


    applyWeatherTheme(
      temperature,
      code
    );


  } catch (error) {

    console.error(
      error
    );


    if ($("weatherTop")) {

      $("weatherTop")
        .textContent =
        "Weather unavailable";

    }


    if ($("stWeather")) {

      $("stWeather")
        .textContent =
        "--°C";

    }

  }

}



async function loadLocationName(
  latitude,
  longitude
) {

  try {

    const url =

      "https://api.bigdatacloud.net/data/reverse-geocode-client"

      +

      `?latitude=${latitude}`

      +

      `&longitude=${longitude}`

      +

      "&localityLanguage=en";


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        "Location unavailable"
      );

    }


    const data =
      await response.json();


    const city =

      data.city

      ||

      data.locality

      ||

      data.localityInfo
        ?.administrative?.[2]
        ?.name

      ||

      "Local area";


    const region =

      data.principalSubdivision

      ||

      "";


    const country =

      data.countryName

      ||

      "";


    const shortLocation =

      region

        ?
        `${city}, ${region}`

        :
        city;


    if ($("locationTop")) {

      $("locationTop")
        .textContent =
        shortLocation;

    }


    if ($("stLocation")) {

      $("stLocation")
        .textContent =

        country

          ?
          `${shortLocation}, ${country}`

          :
          shortLocation;

    }


  } catch (error) {

    console.error(
      error
    );


    if ($("locationTop")) {

      $("locationTop")
        .textContent =
        "Your location";

    }


    if ($("stLocation")) {

      $("stLocation")
        .textContent =
        "Location unavailable";

    }

  }

}



async function approximateLocation() {

  try {

    const response =
      await fetch(

        "https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en"

      );


    if (!response.ok) {

      throw new Error(
        "Approximate location unavailable"
      );

    }


    const data =
      await response.json();


    const city =

      data.city

      ||

      data.locality

      ||

      "Your area";


    const region =

      data.principalSubdivision

      ||

      "";


    const text =

      region

        ?
        `${city}, ${region}`

        :
        city;


    if ($("locationTop")) {

      $("locationTop")
        .textContent =
        text;

    }


    if ($("stLocation")) {

      $("stLocation")
        .textContent =
        text;

    }


    if (
      data.latitude
      &&
      data.longitude
    ) {

      await loadWeather(

        data.latitude,

        data.longitude

      );

    }


  } catch {

    if ($("locationTop")) {

      $("locationTop")
        .textContent =
        "Location unavailable";

    }

  }

}



function startWeatherSystem() {

  if (
    !navigator.geolocation
  ) {

    approximateLocation();

    return;

  }


  navigator
    .geolocation
    .getCurrentPosition(


      async (
        position
      ) => {

        const latitude =
          position.coords
            .latitude;


        const longitude =
          position.coords
            .longitude;


        await Promise.all([

          loadLocationName(
            latitude,
            longitude
          ),

          loadWeather(
            latitude,
            longitude
          )

        ]);

      },


      () => {

        approximateLocation();

      },


      {

        enableHighAccuracy:
          false,

        timeout:
          10000,

        maximumAge:
          600000

      }


    );

}



/* ==========================================
   START
========================================== */

renderPriority();

renderHome();

startWeatherSystem();
