const STORE = "ampro_complete_v1";
const TASKSTORE = "ampro_tasks_v1";

const DEFAULT_STATE = {
  todayKey: "",
  todaySec: 0,
  totalSec: 0,
  visits: 0,
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
      ...JSON.parse(localStorage.getItem(STORE) || "{}")
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
})();

const save = () => {
  localStorage.setItem(STORE, JSON.stringify(state));
};

const todayKey = () => new Date().toISOString().slice(0, 10);

if (state.todayKey !== todayKey()) {
  state.todayKey = todayKey();
  state.todaySec = 0;
}

state.visits += 1;
save();

const app = document.getElementById("app");

const $ = (id) => document.getElementById(id);

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;

  return `${s}s`;
};

let currentQuiz = null;
let currentFlash = null;
let examInterval = null;


/* =====================================================
   GLOBAL STUDY TIMER
===================================================== */

setInterval(() => {
  if (!document.hidden) {
    state.todaySec += 1;
    state.totalSec += 1;

    if (state.totalSec % 5 === 0) {
      save();
    }

    renderStats();
  }
}, 1000);


function renderStats() {

  if ($("globalTimer")) {
    $("globalTimer").textContent = formatTime(state.todaySec);
  }

  if ($("stToday")) {
    $("stToday").textContent = formatTime(state.todaySec);
  }

  if ($("stTotal")) {
    $("stTotal").textContent = formatTime(state.totalSec);
  }

  if ($("stQ")) {
    $("stQ").textContent = state.answered;
  }

  if ($("stAcc")) {

    const accuracy =
      state.answered > 0
        ? Math.round((state.correct / state.answered) * 100)
        : 0;

    $("stAcc").textContent = `${accuracy}%`;
  }

  if ($("stMist")) {
    $("stMist").textContent = state.mistakes.length;
  }

  if ($("stVisits")) {
    $("stVisits").textContent = state.visits;
  }
}


if ($("dateTop")) {
  $("dateTop").textContent =
    new Date().toLocaleDateString("en-NZ", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
}

renderStats();


/* =====================================================
   NAVIGATION
===================================================== */

document.addEventListener("click", (event) => {

  const button = event.target.closest("[data-route]");

  if (!button) return;

  route(button.dataset.route);
});


function route(name) {

  document
    .querySelectorAll(".nav button")
    .forEach((button) => {

      button.classList.toggle(
        "active",
        button.dataset.route === name
      );

    });


  const routes = {

    home: renderHome,

    notes: renderNotesHome,

    flash: renderFlashHome,

    bank: renderQuestionBank,

    short: renderShortAnswers,

    quizzes: renderQuizzes,

    mocks: renderMocks,

    mistakes: renderMistakes,

    schedule: renderSchedule,

    progress: renderProgress

  };


  const pageFunction = routes[name] || renderHome;

  pageFunction();


  window.scrollTo({
    top: 120,
    behavior: "smooth"
  });

}


/* =====================================================
   UTILITY FUNCTIONS
===================================================== */

function heading(kicker, title, description = "") {

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

  const copy = [...array];

  for (
    let i = copy.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
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


/* =====================================================
   QUESTION DATA
===================================================== */

function getAllQuestions() {

  if (!window.AM_CHAPTERS) return [];

  return AM_CHAPTERS.flatMap((chapter) => {

    return chapter.mcq.map((question, index) => {

      return {

        id:
          `c${chapter.id}-${index + 1}`,

        chapter:
          chapter.id,

        chapterTitle:
          chapter.title,

        question:
          question[0],

        options:
          question[1],

        correct:
          question[2],

        explanation:
          question[3],

        level:
          question[4] || "CORE"

      };

    });

  });

}


function prepareQuestions(questions) {

  return shuffle(questions).map((question) => {

    const options =
      question.options.map(
        (text, index) => ({
          text,
          correct:
            index === question.correct
        })
      );

    const shuffledOptions =
      shuffle(options);

    return {

      ...question,

      shuffledOptions,

      correctIndex:
        shuffledOptions.findIndex(
          (option) => option.correct
        )

    };

  });

}


/* =====================================================
   HOME
===================================================== */

function renderHome() {

  if (!window.AM_CHAPTERS) {

    app.innerHTML = `
      <div class="panel">
        Chapter data failed to load.
      </div>
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

      ${AM_CHAPTERS.map((chapter) => `

        <article
          class="card"
          onclick="openNote(${chapter.id})"
        >

          <small>
            CHAPTER ${chapter.id}
          </small>

          <h3>
            ${chapter.title}
          </h3>

          <p>
            ${chapter.subtitle}
          </p>

          <p>
            ${chapter.notes
              .slice(0, 3)
              .map((note) => note[0])
              .join(" • ")
            }
          </p>

        </article>

      `).join("")}

    </div>

    `;

}


/* =====================================================
   NOTES
===================================================== */

function renderNotesHome() {
  openNote(1);
}


function openNote(id) {

  const chapter =
    AM_CHAPTERS.find(
      (chapter) =>
        chapter.id === id
    );

  if (!chapter) return;


  app.innerHTML =

    heading(
      "COMPLETE NOTES",
      `Chapter ${id} — ${chapter.title}`,
      "High-yield notes with exam keys."
    )

    +

    `

    <div class="chips">

      ${AM_CHAPTERS.map((chapterItem) => `

        <button
          class="chip ${
            chapterItem.id === id
              ? "active"
              : ""
          }"
          onclick="openNote(${chapterItem.id})"
        >

          Chapter ${chapterItem.id}

        </button>

      `).join("")}

    </div>


    <article class="panel note">

      ${chapter.notes.map((note) => `

        <h3>
          ${note[0]}
        </h3>

        <p>
          ${note[1]}
        </p>

        <div class="exam-key">

          <b>
            EXAM KEY:
          </b>

          ${note[2]}

        </div>

      `).join("")}

    </article>

    `;

}


/* =====================================================
   FLASHCARDS
===================================================== */

function renderFlashHome() {

  app.innerHTML =

    heading(
      "ACTIVE RECALL",
      "Flashcard Decks",
      "Every deck is shuffled and timed."
    )

    +

    `

    <div class="grid">

      ${AM_CHAPTERS.map((chapter) => `

        <article
          class="card"
          onclick="startFlash(${chapter.id})"
        >

          <small>
            ${chapter.flash.length} CARDS
          </small>

          <h3>
            Chapter ${chapter.id}
          </h3>

          <p>
            ${chapter.title}
          </p>

        </article>

      `).join("")}

    </div>

    `;

}


function startFlash(id) {

  const chapter =
    AM_CHAPTERS.find(
      (chapter) =>
        chapter.id === id
    );

  if (!chapter) return;


  currentFlash = {

    id,

    title:
      `Chapter ${id} — ${chapter.title}`,

    cards:
      shuffle(chapter.flash),

    index: 0,

    startedAt:
      Date.now(),

    cardStartedAt:
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

  const flash =
    currentFlash;

  const card =
    flash.cards[
      flash.index
    ];


  const colours = [

    ["#162a48", "#6386ff"],

    ["#14352e", "#55e1bb"],

    ["#3a2818", "#ffb45e"],

    ["#311d3e", "#c27cff"],

    ["#15333e", "#55c8ff"],

    ["#361d27", "#ff7ca2"]

  ];


  const colour =
    colours[
      flash.index %
      colours.length
    ];


  const elapsed =
    Math.round(
      (
        Date.now() -
        flash.startedAt
      ) / 1000
    );


  app.innerHTML =

    heading(
      "FLASHCARD SESSION",
      flash.title,
      "Reveal the answer before rating yourself."
    )

    +

    `

    <div class="timerbar">

      <span>
        Card ${flash.index + 1}
        /
        ${flash.cards.length}
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
              (flash.index + 1) /
              flash.cards.length
            ) * 100
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
        CARD ${flash.index + 1}
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

        ${card[2]}

      </div>

    </div>


    <div class="actions">

      <button
        class="primary"
        onclick="revealFlash()"
      >
        Reveal Answer
      </button>


      <button
        class="danger"
        onclick="rateFlash('again')"
      >
        Again
      </button>


      <button
        class="secondary"
        onclick="rateFlash('learning')"
      >
        Learning
      </button>


      <button
        class="primary"
        onclick="rateFlash('mastered')"
      >
        Mastered
      </button>

    </div>

    `;

}


function revealFlash() {

  $("flashAnswer").style.display =
    "block";

  $("flashExplain").style.display =
    "block";

}


function rateFlash(rating) {

  currentFlash
    .ratings[rating] += 1;


  if (
    currentFlash.index <
    currentFlash.cards.length - 1
  ) {

    currentFlash.index += 1;

    currentFlash.cardStartedAt =
      Date.now();

    renderFlashCard();

    return;

  }


  finishFlash();

}


function finishFlash() {

  const seconds =
    Math.round(
      (
        Date.now() -
        currentFlash.startedAt
      ) / 1000
    );


  const record = {

    title:
      currentFlash.title,

    date:
      new Date()
        .toISOString(),

    seconds,

    total:
      currentFlash.cards.length,

    ...currentFlash.ratings

  };


  state.flashAttempts.push(record);

  save();


  app.innerHTML =

    heading(
      "DECK COMPLETE",
      "Flashcard Result",
      "This session has been saved."
    )

    +

    `

    <article class="result glass">

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
          onclick="renderFlashHome()"
        >
          Back to Decks
        </button>

      </div>

    </article>

    `;

}


/* =====================================================
   QUESTION BANK
===================================================== */

function renderQuestionBank() {

  const allQuestions =
    getAllQuestions();


  app.innerHTML =

    heading(
      "MASTER QUESTION BANK",
      "Question Bank",
      "Questions and answer positions shuffle every new attempt."
    )

    +

    `

    <div class="grid">


      <article
        class="card"
        onclick="
          startQuiz(
            getAllQuestions(),
            'Mixed Master Bank',
            true,
            'bank'
          )
        "
      >

        <small>
          ${allQuestions.length}
          QUESTIONS
        </small>

        <h3>
          All Chapters
        </h3>

        <p>
          Mixed Chapter 1–4 practice.
        </p>

      </article>


      ${AM_CHAPTERS.map((chapter) => `

        <article
          class="card"
          onclick="
            startChapterBank(
              ${chapter.id}
            )
          "
        >

          <small>
            ${chapter.mcq.length}
            QUESTIONS
          </small>

          <h3>
            Chapter ${chapter.id}
          </h3>

          <p>
            ${chapter.title}
          </p>

        </article>

      `).join("")}


    </div>

    `;

}


function startChapterBank(id) {

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


/* =====================================================
   QUIZ ENGINE
===================================================== */

function startQuiz(
  questions,
  title,
  instantFeedback = true,
  source = "bank",
  minutes = null
) {

  if (!questions.length) {

    app.innerHTML = `
      <div class="panel">
        No questions available.
      </div>
    `;

    return;
  }


  clearInterval(examInterval);


  currentQuiz = {

    title,

    source,

    instantFeedback,

    questions:
      prepareQuestions(
        questions
      ),

    index: 0,

    startedAt:
      Date.now(),

    questionStartedAt:
      Date.now(),

    answers: [],

    deadline:
      minutes
        ? Date.now() +
          minutes * 60000
        : null,

    minutes

  };


  renderQuizQuestion();


  if (minutes) {

    examInterval =
      setInterval(() => {

        if (!currentQuiz) return;


        if (
          Date.now() >=
          currentQuiz.deadline
        ) {

          clearInterval(
            examInterval
          );

          finishQuiz();

        } else {

          updateQuizTimer();

        }

      }, 1000);

  }

}


function updateQuizTimer() {

  const timer =
    $("sessionTimer");

  if (!timer) return;


  if (
    currentQuiz.deadline
  ) {

    timer.textContent =
      formatTime(
        Math.max(
          0,
          Math.round(
            (
              currentQuiz.deadline -
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
            Date.now() -
            currentQuiz.startedAt
          ) / 1000
        )
      );

  }

}


function renderQuizQuestion() {

  const quiz =
    currentQuiz;

  const question =
    quiz.questions[
      quiz.index
    ];

  const answer =
    quiz.answers[
      quiz.index
    ];


  const elapsed =
    quiz.deadline
      ? Math.max(
          0,
          Math.round(
            (
              quiz.deadline -
              Date.now()
            ) / 1000
          )
        )
      : Math.round(
          (
            Date.now() -
            quiz.startedAt
          ) / 1000
        );


  app.innerHTML =

    heading(
      quiz.instantFeedback
        ? "LIVE PRACTICE"
        : "TIMED MOCK EXAM",

      quiz.title,

      quiz.instantFeedback
        ? "Correct answer and explanation appear immediately."
        : "Feedback is hidden until Submit."
    )

    +

    `

    <div class="timerbar">

      <span>
        Question
        ${quiz.index + 1}
        /
        ${quiz.questions.length}
      </span>

      <strong id="sessionTimer">

        ${formatTime(elapsed)}

      </strong>

    </div>


    <div class="progress">

      <span
        style="
          width:
          ${
            (
              (quiz.index + 1) /
              quiz.questions.length
            ) * 100
          }%
        "
      >
      </span>

    </div>


    <article class="panel quiz">


      <p class="eyebrow">

        CHAPTER
        ${question.chapter}

        •

        ${
          question.level ||
          "CORE"
        }

      </p>


      <h3>
        ${question.question}
      </h3>


      ${question.shuffledOptions
        .map(
          (option, index) => `

        <button
          class="
            option
            ${
              answer &&
              answer.choice === index
                ? "selected"
                : ""
            }
          "
          onclick="
            chooseAnswer(
              ${index},
              this
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
          onclick="nextQuizQuestion()"
        >

          ${
            quiz.index ===
            quiz.questions.length - 1

              ? "Submit"

              : "Next Question"
          }

        </button>

      </div>

    </article>

    `;

}


function chooseAnswer(
  choice,
  button
) {

  const quiz =
    currentQuiz;

  if (
    quiz.answers[
      quiz.index
    ]
  ) return;


  const question =
    quiz.questions[
      quiz.index
    ];


  const seconds =
    Math.round(
      (
        Date.now() -
        quiz.questionStartedAt
      ) / 1000
    );


  const correct =
    choice ===
    question.correctIndex;


  quiz.answers[
    quiz.index
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
      state.mistakes.some(
        (mistake) =>
          mistake.id ===
          question.id
      );


    if (!exists) {

      state.mistakes.push({

        id:
          question.id,

        chapter:
          question.chapter,

        question:
          question.question,

        correct:
          question
            .shuffledOptions[
              question.correctIndex
            ]
            .text,

        explanation:
          question.explanation

      });

    }

  }


  if (
    quiz.instantFeedback
  ) {

    document
      .querySelectorAll(
        ".option"
      )
      .forEach(
        (
          optionButton,
          index
        ) => {

          if (
            index ===
            question.correctIndex
          ) {

            optionButton
              .classList
              .add("correct");

          } else if (
            index === choice
          ) {

            optionButton
              .classList
              .add("wrong");

          }

        }
      );


    $("feedback").style.display =
      "block";


    $("feedback").innerHTML = `

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
        Time on question:
        ${seconds}s
      </small>

    `;

  }


  $("nextButton").style.display =
    "inline-block";


  save();

  renderStats();

}


function nextQuizQuestion() {

  if (
    currentQuiz.index <
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


  const quiz =
    currentQuiz;


  if (!quiz) return;


  const totalSeconds =
    Math.round(
      (
        Date.now() -
        quiz.startedAt
      ) / 1000
    );


  const correct =
    quiz.answers.filter(
      (answer) =>
        answer &&
        answer.correct
    ).length;


  const answered =
    quiz.answers.filter(
      Boolean
    ).length;


  const total =
    quiz.questions.length;


  const score =
    Math.round(
      (
        correct /
        total
      ) * 100
    );


  const attempt = {

    title:
      quiz.title,

    source:
      quiz.source,

    date:
      new Date()
        .toISOString(),

    seconds:
      totalSeconds,

    correct,

    total,

    answered,

    score

  };


  state.attempts.push(
    attempt
  );


  save();


  const originalQuiz =
    quiz;


  app.innerHTML =

    heading(
      "ATTEMPT COMPLETE",
      originalQuiz.title,
      "Full answer review is now unlocked."
    )

    +

    `

    <article class="result glass">


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
            ${
              answered -
              correct
            }
          </b>

        </div>


        <div>

          Unanswered
          <br>

          <b>
            ${
              total -
              answered
            }
          </b>

        </div>


        <div>

          Total Time
          <br>

          <b>
            ${formatTime(totalSeconds)}
          </b>

        </div>


        <div>

          Avg / Question
          <br>

          <b>

            ${
              answered
                ? Math.round(
                    totalSeconds /
                    answered
                  )
                : 0
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
          id="retryMistakesButton"
        >
          Retry Mistakes
        </button>


        <button
          class="secondary"
          data-route="${
            originalQuiz.source === "mocks"
              ? "mocks"
              : originalQuiz.source === "quizzes"
              ? "quizzes"
              : "bank"
          }"
        >
          Back
        </button>


      </div>


      <h3>
        Full Answer Review
      </h3>


      ${originalQuiz.questions
        .map(
          (question, index) => {

            const answer =
              originalQuiz
                .answers[index];


            return `

              <div
                class="
                  review
                  ${
                    answer &&
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
                      ? question
                          .shuffledOptions[
                            answer.choice
                          ]
                          .text
                      : "Unanswered"
                  }

                  <br>


                  Correct answer:

                  ${
                    question
                      .shuffledOptions[
                        question.correctIndex
                      ]
                      .text
                  }

                  <br>


                  ${question.explanation}

                  <br>


                  <small>

                    ${
                      answer
                        ? answer.seconds
                        : 0
                    }s

                  </small>

                </p>

              </div>

            `;

          }
        )
        .join("")}

    </article>

    `;


  $("resitButton").onclick =
    () => {

      const rebuiltQuestions =
        originalQuiz.questions.map(
          (question) => {

            return {

              id:
                question.id,

              chapter:
                question.chapter,

              chapterTitle:
                question.chapterTitle,

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

            };

          }
        );


      startQuiz(
        rebuiltQuestions,
        originalQuiz.title,
        originalQuiz.instantFeedback,
        originalQuiz.source,
        originalQuiz.minutes
      );

    };


  $("retryMistakesButton").onclick =
    () => {

      const missedQuestions =
        originalQuiz.questions
          .filter(
            (
              question,
              index
            ) => {

              const answer =
                originalQuiz
                  .answers[index];

              return (
                !answer ||
                !answer.correct
              );

            }
          )
          .map(
            (question) => {

              return {

                id:
                  question.id,

                chapter:
                  question.chapter,

                chapterTitle:
                  question.chapterTitle,

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

              };

            }
          );


      if (
        missedQuestions.length
      ) {

        startQuiz(
          missedQuestions,
          "Retry Missed Questions",
          true,
          originalQuiz.source
        );

      }

    };

}


/* =====================================================
   SHORT ANSWERS
===================================================== */

function renderShortAnswers() {

  app.innerHTML =

    heading(
      "WRITTEN RECALL",
      "Short Answers",
      "Write from memory first, then reveal the model answer."
    )

    +

    AM_CHAPTERS
      .map(
        (chapter) => `

        <h3>

          Chapter
          ${chapter.id}
          —
          ${chapter.title}

        </h3>


        ${chapter.saq
          .map(
            (
              item,
              index
            ) => `

            <article class="panel">


              <p class="eyebrow">

                SAQ
                ${index + 1}

              </p>


              <h4>

                ${item[0]}

              </h4>


              <textarea
                placeholder="
                  Write your answer here
                  before revealing
                  the model answer...
                "
              >
              </textarea>


              <div class="actions">

                <button
                  class="secondary"
                  onclick="
                    revealModel(
                      this
                    )
                  "
                >

                  Reveal Model Answer

                </button>

              </div>


              <div class="model">

                ${item[1]}

              </div>


            </article>

          `
          )
          .join("")}

      `
      )
      .join("");

}


function revealModel(button) {

  const model =
    button
      .parentElement
      .nextElementSibling;


  model.style.display =
    "block";

}


/* =====================================================
   QUIZZES
===================================================== */

function renderQuizzes() {

  if (!window.AM_QUIZZES) {

    app.innerHTML = `
      <div class="panel">
        Quiz data failed to load.
      </div>
    `;

    return;
  }


  app.innerHTML =

    heading(
      "COURSE PRACTICE",
      "6 Quiz Sets",
      "Teacher and revision-style practice stays separate from the master bank."
    )

    +

    `

    <div class="grid">

      ${AM_QUIZZES.map(
        (quizItem, index) => `

        <article
          class="card"
          onclick="
            launchQuiz(
              ${index}
            )
          "
        >

          <small>

            ${
              quizItem
                .mode
                .toUpperCase()
            }

          </small>


          <h3>

            ${quizItem.title}

          </h3>


          <p>

            ${
              quizItem.chapter
                ? `Chapter ${quizItem.chapter}`
                : "Mixed Chapters 1–4"
            }

          </p>

        </article>

      `
      ).join("")}

    </div>

    `;

}


function launchQuiz(index) {

  const quizItem =
    AM_QUIZZES[index];


  let questions =
    quizItem.chapter
      ? getAllQuestions()
          .filter(
            (question) =>
              question.chapter ===
              quizItem.chapter
          )
      : getAllQuestions();


  if (
    quizItem.mode ===
    "tricky"
  ) {

    const tricky =
      questions.filter(
        (question) =>
          question.level ===
          "REVERSE/BEST"
      );


    const others =
      questions
        .filter(
          (question) =>
            question.level !==
            "REVERSE/BEST"
        )
        .slice(0, 8);


    questions = [
      ...tricky,
      ...others
    ];

  }


  startQuiz(
    questions,
    quizItem.title,
    true,
    "quizzes"
  );

}


/* =====================================================
   MOCK EXAMS
===================================================== */

function renderMocks() {

  if (!window.AM_MOCKS) {

    app.innerHTML = `
      <div class="panel">
        Mock exam data failed to load.
      </div>
    `;

    return;
  }


  app.innerHTML =

    heading(
      "EXAM CENTRE",
      "5 Mock Exams",
      "Timed mode with no instant answer feedback."
    )

    +

    `

    <div class="grid">

      ${AM_MOCKS.map(
        (mock, index) => `

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

            Timed Chapter 1–4 simulation.

          </p>

        </article>

      `
      ).join("")}

    </div>

    `;

}


function launchMock(index) {

  const mock =
    AM_MOCKS[index];


  const pool =
    getAllQuestions();


  const questions =
    shuffle(pool)
      .slice(
        0,
        Math.min(
          20,
          pool.length
        )
      );


  startQuiz(
    questions,
    mock.title,
    false,
    "mocks",
    mock.minutes
  );

}


/* =====================================================
   MISTAKE VAULT
===================================================== */

function renderMistakes() {

  app.innerHTML =

    heading(
      "TARGETED RECOVERY",
      "Mistake Vault",
      "Wrong practice questions are saved automatically."
    )

    +

    (
      state.mistakes.length

        ? `

          <div class="actions">

            <button
              class="primary"
              onclick="retryMistakeVault()"
            >
              Retry All Mistakes
            </button>


            <button
              class="danger"
              onclick="clearMistakeVault()"
            >
              Clear Vault
            </button>

          </div>


          ${state.mistakes.map(
            (mistake) => `

            <article class="mistake">

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
          ).join("")}

        `

        : `

          <article class="panel">

            No mistakes waiting 🎯

          </article>

        `
    );

}


function retryMistakeVault() {

  const ids =
    new Set(
      state.mistakes.map(
        (mistake) =>
          mistake.id
      )
    );


  const questions =
    getAllQuestions()
      .filter(
        (question) =>
          ids.has(
            question.id
          )
      );


  if (questions.length) {

    startQuiz(
      questions,
      "Mistake Vault Retry",
      true,
      "bank"
    );

  }

}


function clearMistakeVault() {

  const confirmed =
    confirm(
      "Clear all saved mistakes on this device?"
    );


  if (!confirmed) return;


  state.mistakes = [];

  save();

  renderStats();

  renderMistakes();

}


/* =====================================================
   SCHEDULE
===================================================== */

function getTaskMap() {

  try {

    return JSON.parse(
      localStorage.getItem(
        TASKSTORE
      ) || "{}"
    );

  } catch {

    return {};

  }

}


function renderSchedule() {

  if (!window.AM_SCHEDULE) {

    app.innerHTML = `
      <div class="panel">
        Schedule data failed to load.
      </div>
    `;

    return;
  }


  const done =
    getTaskMap();


  const tasks =
    [...AM_SCHEDULE]
      .sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      );


  app.innerHTML =

    heading(
      "STREAM C",
      "Schedule & Tasks",
      "Mark completed work and upcoming items will remain organised."
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
              done[task.id]
                ? "done"
                : ""
            }
          "
        >


          <div>


            <small>

              ${
                new Date(
                  task.date +
                  "T12:00:00"
                )
                .toLocaleDateString(
                  "en-NZ",
                  {
                    weekday: "short",
                    day: "numeric",
                    month: "short"
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
                  ? "Stream C relevant"
                  : "All streams"
              }

            </p>


          </div>


          <button
            class="
              ${
                done[task.id]
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
              done[task.id]
                ? "Completed ✓"
                : "Mark Done"
            }

          </button>


        </article>

      `
      )
      .join("");

}


function toggleTask(id) {

  const done =
    getTaskMap();


  done[id] =
    !done[id];


  localStorage.setItem(
    TASKSTORE,
    JSON.stringify(done)
  );


  renderSchedule();

  renderPriority();

}


/* =====================================================
   NEXT PRIORITY
===================================================== */

function renderPriority() {

  if (!window.AM_SCHEDULE) {

    $("priorityTitle")
      .textContent =
      "Schedule unavailable";

    return;

  }


  const done =
    getTaskMap();


  const today =
    todayKey();


  const next =
    AM_SCHEDULE
      .filter(
        (task) =>
          task.date >= today &&
          !done[task.id]
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(
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


  const days =
    Math.ceil(
      (
        new Date(
          next.date +
          "T12:00:00"
        ) -
        new Date()
      ) /
      86400000
    );


  $("priorityMeta")
    .textContent =

    `${
      new Date(
        next.date +
        "T12:00:00"
      )
      .toLocaleDateString(
        "en-NZ",
        {
          weekday: "long",
          day: "numeric",
          month: "long"
        }
      )
    }

    •

    ${
      days <= 0
        ? "Today"
        : days === 1
        ? "Tomorrow"
        : `${days} days`
    }`;

}


/* =====================================================
   PROGRESS
===================================================== */

function renderProgress() {

  const attempts =
    [...state.attempts]
      .reverse();


  const flashAttempts =
    [...state.flashAttempts]
      .reverse();


  const bestScore =
    state.attempts.length
      ? Math.max(
          ...state.attempts.map(
            (attempt) =>
              attempt.score
          )
        )
      : 0;


  app.innerHTML =

    heading(
      "LEARNING ANALYTICS",
      "Progress History",
      "Attempts, study time and flashcard results saved on this browser."
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
          ${formatTime(state.totalSec)}
        </strong>

      </div>


      <div class="stat glass">

        <small>
          Questions
        </small>

        <strong>
          ${state.answered}
        </strong>

      </div>


      <div class="stat glass">

        <small>
          Visits
        </small>

        <strong>
          ${state.visits}
        </strong>

      </div>


    </section>


    <h3>
      Quiz / Exam Attempts
    </h3>


    ${
      attempts.length

        ? attempts.map(
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

                ${formatTime(
                  attempt.seconds
                )}

              </p>

            </article>

          `
          ).join("")

        : `

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

        ? flashAttempts.map(
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

                ${formatTime(
                  attempt.seconds
                )}

                •

                Mastered
                ${attempt.mastered}
                /
                ${attempt.total}

              </p>

            </article>

          `
          ).join("")

        : `

          <article class="panel">

            No completed flashcard decks yet.

          </article>

        `
    }

    `;

}


/* =====================================================
   START APPLICATION
===================================================== */

renderPriority();

renderHome();
