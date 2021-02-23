
import { observable } from './observable.js';
import { autorun, runInAction } from './box.js';

const store = observable({
    todos: [
        {
            title: "Learn observable",
            done: false
        },
        {
            title: "Learn autorun",
            done: true
        },
        {
            title: "Learn computed",
            done: true
        },
        {
            title: "Learn action",
            done: true
        }
    ],
    unfinished: 0
});

autorun(() => {
    console.log("**Computing**");
    store.unfinished = store.todos.filter(todo => !todo.done).length;
});

const d = autorun( () => {
    console.log("Amount of todos left: " + store.unfinished);
});

store.todos[0].done = true;