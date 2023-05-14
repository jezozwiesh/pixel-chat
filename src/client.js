const socket = io();

const chat_form = document.getElementById('chat-form');
const message_input = document.getElementById('message-input');
const messages_div = document.getElementById('messages');

chat_form.addEventListener('submit', (event) =>{
    event.preventDefault();
    const message = message_input.value;
    socket.emit('message', message);
    message_input.value = '';
});


socket.on('init', function(messages) {
    messages.reverse().forEach((message) => {
        const message_element = document.createElement('div');
        message_element.textContent = `[${message.created}] ${message.username}: ${message.message}`;
        messages_div.appendChild(message_element);
    })
});

socket.on('message', function(message) {
    const message_element = document.createElement('div');
    message_element.textContent = `[${message.created}] ${message.username}: ${message.message}`;
    messages_div.appendChild(message_element);
});