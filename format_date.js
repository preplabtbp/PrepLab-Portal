const iterDate = new Date();
const parts = iterDate.toDateString().split(' ');
const day = parseInt(parts[2], 10);
const formattedDate = day + ' ' + parts[1] + ' ' + parts[3].substring(2);
console.log(formattedDate);
