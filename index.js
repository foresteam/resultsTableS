const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const { exec } = require('child_process');
const fs = require('fs');

const CFG = require('./cfg.js');

const app = express();
app.set('view engine', 'ejs');
app.set('views', __dirname + '/templates');
app.use(bodyParser.urlencoded({ extended: false }));

const formDate = date => `${(date.getDate() < 10 ? '0' : '') + date.getDate()}.${((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1)}.${date.getFullYear()}`;
const formDatetime = date => `${formDate(date)} - ${(date.getHours() < 10 ? '0' : '') + date.getHours()}:${(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()}`;

mongoose.connect(CFG.DBURI, { useNewUrlParser: true, useUnifiedTopology: true });
const Record = mongoose.model('Record', new mongoose.Schema({
	taskName: String,
	student: String,
	class: String,
	mark: Number,
	datetime: Number,
	subTasks: Array({
		name: String,
		text: String,
		correctAnswer: String,
		answer: String,
	})
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
		student: {$regex: `.*(${student.toLowerCase()}).*`},
		class: {$regex: `.*(${_class.toLowerCase()}).*`},
		mark: markF,
		datetime: datetimeF,
		subTasks: {
			name: {$regex: `.*(${subTaskName.toLowerCase()}).*`},
			text: {$regex: `.*(${text.toLowerCase()}).*`},
			correctAnswer: {$regex: `.*(${correctAnswer.toLowerCase()}).*`},
			answer: {$regex: `.*(${answer.toLowerCase()}).*`}
		}
	};
	if (!taskName)
		delete qparams.taskName;
	if (!student)
		delete qparams.student;
	if (!_class)
		delete qparams.class;
	if (!mark)
		delete qparams.mark;
	if (!datetime)
		delete qparams.datetime;
	if (!subTaskName)
		delete qparams.subTasks.name;
	if (!text)
		delete qparams.subTasks.text;
	if (!correctAnswer)
		delete qparams.subTasks.correctAnswer;
	if (!answer)
		delete qparams.subTasks.answer;
	if (!subTaskName && !text && !correctAnswer && !answer)
		delete qparams.subTasks;

	let sort = {};
	if (sortBy)
		sort[sortBy] = sortOrder == 'Возрастание' ? 1 : -1;
	let table = await Record.find(qparams).sort(sort).exec();

	for (let record of table) {
		record.mark = parseInt(record.mark * 100) + '%';
		record.datetime = formDatetime(new Date(record.datetime));
	}

	rs.render('table', { table });
})

app.listen(1338);
// exec('start http://localhost:1337');