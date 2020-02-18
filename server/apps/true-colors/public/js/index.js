let ip;
let playerName = "";
let bannerHue = 90;
let currentVote = null;
const banner = document.querySelector("#titleBanner");
banner.style.backgroundColor = `hsl(${bannerHue}, 100%, 45%)`;

setInterval(() => {
  banner.style.backgroundColor = `hsl(${bannerHue}, 100%, 45%)`;
  bannerHue += 0.25;
  if (bannerHue >= 360) {
    bannerHue -= 360;
  }
},1000/24);

fetch('/whoami').then((response) => {
  return response.json();
}).then((json) => {
  ip = json.ip;
});

const userSort = (a, b) => { // Alphabetical order
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  if (a.id < b.id) {
    return -1;
  }
  if (a.id > b.id) {
    return 1;
  }
  return 0;
}

const voteCount = (votes, user) => {
  return votes.filter((vote) => vote.voteeId === user.id).length;
}

const socket = io("/trueColors");
socket.on("connect", () => {
  console.log('Connected to socket!');
});
socket.on("statusUpdate", (data) => {
  const questionOptions = document.querySelector("#questionOptions");
  const questionResults = document.querySelector("#questionResults");
  questionOptions.innerHTML = "";
  questionResults.innerHTML = "";

  let selectCurrentVote = false;

  document.querySelector("#voteCount").innerText = data.votes.length;

  if (data.reveal) {
    document.querySelector("#questionOptions").hidden = true;
    document.querySelector("#questionResults").hidden = false;
    currentVote = null;
  } else {
    document.querySelector("#questionOptions").hidden = false;
    document.querySelector("#questionResults").hidden = true;
    if (currentVote) {
      selectCurrentVote = true;
    }
  }

  if (data.questions.length === 0) {
    document.querySelector("#questionDiv").classList.remove("b--green");
    document.querySelector("#questionDiv").classList.add("b--red");
    document.querySelector("#questionText").classList.remove("bg-green");
    document.querySelector("#questionText").classList.add("bg-red");
    document.querySelector("#questionText").innerText = "There are no questions in the queue";
  } else {
    document.querySelector("#questionDiv").classList.add("b--green");
    document.querySelector("#questionDiv").classList.remove("b--red");
    document.querySelector("#questionText").classList.add("bg-green");
    document.querySelector("#questionText").classList.remove("bg-red");
    document.querySelector("#questionText").innerText = data.questions[0];

    data.users.sort(userSort); // Alphabetical order
    data.users.map((user) => {
      const userVoteDiv = document.createElement("div");
      const alreadySelected = selectCurrentVote && user.id === currentVote;
      userVoteDiv.className = "mv3";
      userVoteDiv.innerHTML = `
      <input type="radio" name="vote" id="voteid-${user.id}" value="${user.id}" ${alreadySelected ? "checked" : ""}>
      <label for="voteid-${user.id}">${user.name}</label>
      `
      userVoteDiv.firstElementChild.addEventListener('change', () => {
        currentVote = user.id;
      });
      questionOptions.appendChild(userVoteDiv);
    });

    data.users.sort((a, b) => { // Vote count order
      const countDiff = voteCount(data.votes, a) - voteCount(data.votes, b);
      if (countDiff != 0) {
        return -countDiff; // Higher votes first
      }
      return userSort(a, b);
    });

    const totalVotes = data.users.reduce((a,b) => {
      return a + voteCount(data.votes, b);
    }, 0);

    data.users.map((user) => {
      const userVotes = voteCount(data.votes, user);
      const userVoteCountDiv = document.createElement("div");
      userVoteCountDiv.className = "mv3";
      userVoteCountDiv.innerHTML = `
      <p class="f6 mt2 mb0 fw4">${user.name}</p>
      <p class="f3 fw6 mt0 mb2 pt0">${userVotes}</p>
      <div class="h1 bg-blue" style="width:${Math.floor(userVotes / totalVotes * 100)}%"></div>
      `
      questionResults.appendChild(userVoteCountDiv);
    });

    const submitVoteButton = document.createElement("button");
    submitVoteButton.setAttribute("type", "button");
    submitVoteButton.innerText = "Submit Vote";
    submitVoteButton.className = "b pv2 mb3 input-reset ba b--black bg-white dim pointer f6";
    submitVoteButton.onclick = () => {
      currentVote = null;
      const inputs = document.getElementsByName("vote");
      for (i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        if (input.checked) {
          socket.emit("vote", {voteeId: input.value});
        }
      }
    };
    questionOptions.appendChild(submitVoteButton);
  }
  document.querySelector("#questionCount").innerText = data.questions.length;
});

socket.on("nextQuestion", () => {
  document.querySelector("#questionOptions").hidden = false;
  document.querySelector("#questionResults").hidden = true;
});

const showQuestion = (doShow) => {
  if (doShow) {
    document.querySelector("#questionDiv").hidden = false;
  } else {
    document.querySelector("#questionText").innerText = "";
    document.querySelector("#questionOptions").innerHTML = "";
    document.querySelector("#questionDiv").hidden = true;
  }
}

const roomCodeInput = document.querySelector("#roomCodeInput");
const playerNameInput = document.querySelector("#playerNameInput");
const joinRoomButton = document.querySelector("#joinRoomButton");
const nextQuestionButton = document.querySelector("#nextQuestionButton");
const questionInput = document.querySelector("#questionInput");
const submitQuestionButton = document.querySelector("#submitQuestionButton");
const revealResultsButton = document.querySelector("#revealResultsButton");

updateUI = (roomCode) => {
  if (roomCode) {
    document.querySelector("#connectedRoom").innerText = roomCode;
    document.querySelector("#playerName").innerText = playerName;
    document.querySelector("#connectedDiv").hidden = false;
    document.querySelector("#unconnectedDiv").hidden = true;
    document.querySelector("#questionOptions").hidden = false;
    document.querySelector("#questionResults").hidden = true;
  } else {
    document.querySelector("#connectedRoom").innerText = "";
    document.querySelector("#playerName").innerText = "";
    document.querySelector("#connectedDiv").hidden = true;
    document.querySelector("#unconnectedDiv").hidden = false;
    document.querySelector("#questionOptions").hidden = false;
    document.querySelector("#questionResults").hidden = true;
  }
}

roomCodeInput.onkeyup = (evt) => {
  if (evt.keyCode === 13) {
    evt.preventDefault();
    joinRoomButton.click();
  }
}

playerNameInput.onkeyup = (evt) => {
  if (evt.keyCode === 13) {
    evt.preventDefault();
    joinRoomButton.click();
  }
}

joinRoomButton.onclick = () => {
  if (roomCodeInput.value && playerNameInput.value) {
    playerName = playerNameInput.value;
    socket.emit("joinRoom", {roomCode: roomCodeInput.value, ip: ip, playerName: playerNameInput.value});
    updateUI(roomCodeInput.value);
    showQuestion(true);
  }
}

leaveRoomButton.onclick = () => {
  socket.emit("leaveRoom");
  updateUI(null);
  showQuestion(false);
}

nextQuestionButton.onclick = () => {
  socket.emit("nextQuestion");
}

revealResultsButton.onclick = () => {
  socket.emit("revealResults");
}

questionInput.onkeyup = (evt) => {
  if (evt.keyCode === 13) {
    evt.preventDefault();
    submitQuestionButton.click();
  }
}

submitQuestionButton.onclick = () => {
  if (questionInput.value) {
    socket.emit("addQuestion", {question: questionInput.value});
    questionInput.value = "";
  }
}
