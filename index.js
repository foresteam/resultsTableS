const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const { exec } = require('child_process');
const fs = require('fs');

const app = express();
app.set('view engine', 'ejs');
app.set('views', __dirname + '/templates');
app.use(bodyParser.urlencoded({ extended: false }));

const formDate = date => `${(date.getDate() < 10 ? '0' : '') + date.getDate()}.${((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1)}.${date.getFullYear()}`;


mongoose.connect('mongodb://localhost/resultsTableS', { useNewUrlParser: true, useUnifiedTopology: true });
const Record = mongoose.model('Record', new mongoose.Schema({
	taskName: String,
	subTaskName: String,
	student: String,
	class: String,
	text: String,
	correctAnswer: String,
	answer: String,
	mark: Number,
	datetime: Number
}));
Record.createCollection();


app.get('/readf', async (rq, rs) => {
	await Record.deleteMany({}).exec();

	let path = rq.query.dir || './files';
	let files = fs.readdirSync(path);
	for (let file of files) {
		let records = JSON.parse(fs.readFileSync(path + '/' + file, 'utf8'));
		for (let data of records) {
			for (let [k, v] of Object.entries(data))
				if (typeof v == 'string')
					data[k] = v.toLowerCase();
			let record = new Record(data);
			await record.save();
		}
	}

	rs.send('<script>alert("Успех"); location.href = "/";</script>');
})
app.get('/', (rq, rs) => {
	rs.render('form');
});
app.post('/', async (rq, rs) => {
	let { taskName, subTaskName, student, class: _class, text, correctAnswer, answer, mark, markFilter, datetime, datetimeFilter, sortBy, sortOrder } = rq.body;
	datetime = Date.parse(datetime);
	mark = Number.parseFloat(mark);

	let assoc = {
		'=': '$eq',
		'≥': '$gte',
		'≤': '$lte',
		'<': '$lt',
		'>': '$gt'
	};
	let markF = {}, datetimeF = {};
	markF[assoc[markFilter]] = mark ? mark / 100 : 0;
	datetimeF[assoc[datetimeFilter]] = datetime;

	let qparams = {
		taskName: {$regex: `.*(${taskName.toLowerCase()}).*`},
		subTaskName: {$regex: `.*(${subTaskName.toLowerCase()}).*`},
		student: {$regex: `.*(${student.toLowerCase()}).*`},
		class: {$regex: `.*(${_class.toLowerCase()}).*`},
		text: {$regex: `.*(${text.toLowerCase()}).*`},
		correctAnswer: {$regex: `.*(${correctAnswer.toLowerCase()}).*`},
		answer: {$regex: `.*(${answer.toLowerCase()}).*`},
		mark: markF,
		datetime: datetimeF
	};
	if (!taskName)
		delete qparams.taskName;
	if (!subTaskName)
		delete qparams.subTaskName;
	if (!student)
		delete qparams.student;
	if (!_class)
		delete qparams.class;
	if (!text)
		delete qparams.text;
	if (!correctAnswer)
		delete qparams.correctAnswer;
	if (!answer)
		delete qparams.answer;
	if (!mark)
		delete qparams.mark;
	if (!datetime)
		delete qparams.datetime;

	let sort = {};
	if (sortBy)
		sort[sortBy] = sortOrder == 'Возрастание' ? 1 : -1;
	let table = await Record.find(qparams).sort(sort).exec();

	rs.render('table', { table, formDate });
})

app.listen(1338);
// exec('start http://localhost:1337');