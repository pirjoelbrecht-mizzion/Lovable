// Test to see what's in localStorage
const testUser = localStorage.getItem('demoUser');
console.log('demoUser:', testUser ? JSON.parse(testUser) : null);
