const status = document.querySelector("#poll-status");
const title = document.querySelector("#poll-title");
const comment = document.querySelector("#poll-comment");
const timezone = document.querySelector("#poll-timezone");
const expiry = document.querySelector("#poll-expiry");
const survey = document.querySelector("#survey");
const results = document.querySelector("#results");
const player = document.querySelector("#player");
const availability = document.querySelector("#availability");
const form = document.querySelector("#vote-form");
const submit = document.querySelector("#submit");
const message = document.querySelector("#form-message");
const pollId = /^\/s\/([a-f0-9]{32})\/?$/.exec(location.pathname)?.[1];
let poll;

const labels = {
  available: "Disponible",
  maybe: "Peut-être",
  unavailable: "Indisponible",
};

const showError = (text) => {
  status.textContent = text;
  status.classList.add("error");
};

const addAvailabilityChoice = (slotId, value, label, checked = false) => {
  const wrapper = document.createElement("label");
  const input = document.createElement("input");
  input.type = "radio";
  input.name = `slot-${slotId}`;
  input.value = value;
  input.required = true;
  input.checked = checked;
  wrapper.append(input, document.createTextNode(label));
  return wrapper;
};

function renderPoll(data) {
  poll = data;
  title.textContent = data.title;
  comment.textContent = data.comment || "";
  comment.hidden = !data.comment;
  status.textContent = data.state === "open"
    ? "Indiquez vos disponibilités pour aider le MJ à choisir une date."
    : "Ce sondage est clôturé. Les dates et le récapitulatif des réponses restent consultables.";
  timezone.textContent = `Les dates et heures sont indiquées dans le fuseau du MJ : ${data.timezone}.`;
  const expiresOn = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: data.timezone,
  }).format(new Date(data.expiresAt));
  expiry.textContent = `Les dates et résultats resteront consultables jusqu'au ${expiresOn} inclus (heure du MJ).`;
  results.replaceChildren();
  results.setAttribute("aria-label", "Résumé des disponibilités");
  data.slots.forEach((slot) => {
    const card = document.createElement("article");
    card.className = "result-card";
    const heading = document.createElement("h2");
    const parsedDate = new Date(`${slot.date}T${slot.time}:00Z`);
    heading.textContent = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(parsedDate);
    const counts = document.createElement("div");
    counts.className = "result-counts";
    const available = document.createElement("span");
    available.className = "count-available";
    available.textContent = `${slot.available || 0} disponible(s)`;
    const maybe = document.createElement("span");
    maybe.className = "count-maybe";
    maybe.textContent = `${slot.maybe || 0} peut-être`;
    const unavailable = document.createElement("span");
    unavailable.textContent = `${slot.unavailable || 0} indisponible(s)`;
    counts.append(available, maybe, unavailable);
    card.append(heading, counts);
    results.append(card);
  });

  player.replaceChildren(new Option("Choisissez votre nom", ""));
  data.players.forEach((name) => player.add(new Option(name, name)));
  availability.replaceChildren(document.createElement("legend"));
  availability.firstElementChild.textContent = "Vos disponibilités";
  data.slots.forEach((slot) => {
    const section = document.createElement("section");
    section.className = "slot";
    const heading = document.createElement("span");
    heading.className = "slot-title";
    heading.textContent = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(`${slot.date}T${slot.time}:00Z`));
    const choices = document.createElement("div");
    choices.className = "choices";
    choices.append(
      addAvailabilityChoice(slot.id, "available", labels.available),
      addAvailabilityChoice(slot.id, "maybe", labels.maybe),
      addAvailabilityChoice(slot.id, "unavailable", labels.unavailable)
    );
    section.append(heading, choices);
    availability.append(section);
  });
  form.hidden = data.state !== "open";
  survey.hidden = false;
  if (data.state !== "open") submit.disabled = true;
}

async function loadPoll() {
  if (!pollId) {
    showError("Le lien du sondage est incomplet ou invalide.");
    return;
  }
  try {
    const response = await fetch(`/api/polls/${pollId}`, { headers: { Accept: "application/json" } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Le sondage n'a pas pu être chargé.");
    renderPoll(body);
  } catch (error) {
    showError(error.message || "Connexion impossible. Vérifiez votre réseau et réessayez.");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!poll || poll.state !== "open") return;
  const choices = Object.fromEntries(
    poll.slots.map((slot) => [
      slot.id,
      form.querySelector(`input[name="slot-${slot.id}"]:checked`)?.value || "",
    ])
  );
  if (Object.values(choices).some((choice) => !choice)) {
    message.textContent = "Répondez pour chaque date proposée.";
    message.classList.add("error");
    return;
  }

  submit.disabled = true;
  message.textContent = "Envoi en cours…";
  message.classList.remove("error");
  try {
    const response = await fetch(`/api/polls/${pollId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: player.value, choices }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "La réponse n'a pas pu être enregistrée.");
    message.textContent = "Disponibilités enregistrées. Vous pouvez envoyer à nouveau le formulaire pour modifier votre vote.";
    await loadPoll();
    message.textContent = "Disponibilités enregistrées. Vous pouvez envoyer à nouveau le formulaire pour modifier votre vote.";
  } catch (error) {
    message.textContent = error.message || "La réponse n'a pas pu être enregistrée.";
    message.classList.add("error");
  } finally {
    submit.disabled = poll?.state !== "open";
  }
});

loadPoll();
