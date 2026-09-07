// Grab references to the elements we'll need
const form = document.querySelector("#taskForm");
const input = document.querySelector("#taskInput");
const priority = document.querySelector("#priority");
const recurrence = document.querySelector("#recurrence");
const list = document.querySelector("#taskList");

let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");

function parseNaturalDate(text) {
    const date = new Date();
    const lower = text.toLowerCase();

    if (lower.includes("tomorrow")) date.setDate(date.getDate() + 1);
    else if (!lower.includes("today")) return null;

    const time = lower.match(/(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);

    if (time) {
        let hour = Number(time[1]);
        const minute = Number(time[2] || 0);
        const meridiem = time[3];

        if (meridiem === "pm" && hour < 12) hour += 12;
        if (meridiem === "am" && hour === 12) hour = 0;

        date.setHours(hour, minute, 0, 0);
    } else {
        date.setHours(9, 0, 0, 0);
    }

    return date.toISOString();
}

function cleanTaskText(text) {
    return text
        .replace(/\b(today|tomorrow)\b/gi, "")
        .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

function save() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function findTask(id, collection = tasks) {
    for (const task of collection) {
        if (task.id === id) return task;
        const found = findTask(id, task.children);
        if (found) return found;
    }
    return null;
}

function removeTask(id, collection = tasks) {
    const index = collection.findIndex(task => task.id === id);
    if (index !== -1) collection.splice(index, 1);
    else collection.forEach(task => removeTask(id, task.children));
}

function nextRecurrence(task) {
    const date = new Date();

    if (task.recurrence === "weekday") {
        do date.setDate(date.getDate() + 1);
        while ([0, 6].includes(date.getDay()));
    } else if (task.recurrence === "weekly") {
        date.setDate(date.getDate() + 7);
    } else if (task.recurrence === "monthly-first") {
        date.setMonth(date.getMonth() + 1, 1);
        while (date.getDay() !== 1) date.setDate(date.getDate() + 1);
    } else if (task.recurrence === "after-10") {
        date.setDate(date.getDate() + 10);
    } else {
        return;
    }

    task.done = false;
    task.due = date.toISOString();
}

function render(collection = tasks, container = list) {
    container.innerHTML = "";

    collection.forEach(task => {
        const item = document.createElement("li");
        item.className = `task p${task.priority} ${task.done ? "done" : ""}`;

        const header = document.createElement("div");
        header.className = "task-header";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.onchange = () => {
            task.done = checkbox.checked;
            if (task.done && task.recurrence) nextRecurrence(task);
            save();
            render();
        };

        const text = document.createElement("span");
        text.className = "task-text";
        text.textContent = task.text;

        const subtaskButton = document.createElement("button");
        subtaskButton.textContent = "+";
        subtaskButton.title = "Add subtask";
        subtaskButton.onclick = () => {
            const value = prompt("Enter a subtask:");
            if (!value) return;
            task.children.push({
                id: crypto.randomUUID(),
                text: value,
                priority: task.priority,
                done: false,
                due: null,
                recurrence: "",
                children: []
            });
            save();
            render();
        };

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete";
        deleteButton.textContent = "×";
        deleteButton.onclick = () => {
            removeTask(task.id);
            save();
            render();
        };

        header.append(checkbox, text, subtaskButton, deleteButton);
        item.appendChild(header);

        if (task.due || task.recurrence) {
            const meta = document.createElement("small");
            meta.className = "meta";
            meta.textContent =
                `${task.due ? `Due: ${new Date(task.due).toLocaleString()}` : ""}` +
                `${task.recurrence ? ` · ${task.recurrence}` : ""}`;
            item.appendChild(meta);
        }

        const children = document.createElement("ul");
        children.className = "children";
        item.appendChild(children);
        container.appendChild(item);

        render(task.children, children);
    });
}

form.addEventListener("submit", event => {
    event.preventDefault();

    const rawText = input.value.trim();
    if (!rawText) return;

    tasks.push({
        id: crypto.randomUUID(),
        text: cleanTaskText(rawText),
        priority: priority.value,
        recurrence: recurrence.value,
        due: parseNaturalDate(rawText),
        done: false,
        children: []
    });

    input.value = "";
    save();
    render();
});

render();