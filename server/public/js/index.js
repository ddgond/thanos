fetch('/acronym').then((response) => {
  return response.json();
}).then((result) => {
  document.querySelector("#acronym").innerText = `${result.text}`;
});
