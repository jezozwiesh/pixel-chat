const socket = io();

const chat_form = document.getElementById('chat-form');
const message_input = document.getElementById('message-input');
const messages_div = document.getElementById('messages');

const user_form = document.getElementById('user');
const username_input = document.getElementById('username');


chat_form.addEventListener('submit', (event) =>{
    event.preventDefault();
    const message = message_input.value;
    socket.emit('message', message);
    message_input.value = '';
});

user_form.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = username_input.value;
    socket.emit('set client username', username);
});

socket.on('init', function(messages) {
    messages.reverse().forEach((message) => {
        const message_element = document.createElement('div');
        message_element.textContent = `${message.username}: ${message.message}`;
        messages_div.appendChild(message_element);
    })
});

socket.on('message', function(message) {
    const message_element = document.createElement('div');
    message_element.textContent = `${message.username}: ${message.message}`;
    messages_div.appendChild(message_element);
});