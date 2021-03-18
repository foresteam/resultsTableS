import requests
from template import export
from random import randint as rnd
from time import time
from json import dumps as jd

TASKNAME = 'My task name'

# генератор записей
def NewRecord(student):
    cp = export.copy()
    cp['subTasks'].clear()
    cp['datetime'] = time()
    cp['class'] = '11В'
    cp['taskName'] = TASKNAME
    cp['student'] = student
    return cp
def NewSubTask(q):
    return {
        'name': str(q['id']),
        'text': q['text'],
        'correctAnswer': q['correctAnswer'],
        'answer': q['answer']
    }

data = []

test = []
# генерируем тест
for i in range(3):
    a, b = rnd(0, 9), rnd(0, 9)
    task = {'id': i, 'nums': [a, b], 'correctAnswer': str(a * b), 'answer': None, 'correct': False}
    task['text'] = f'{a} * {b} = '
    test.append(task)

# результаты учеников
for i in range(1):
    username = input('Enter your full name: ')

    # собираем ответы
    for q in test:
        a, b = q['nums']
        q['text'] = f'{a} * {b} = '
        q['answer'] = input(q['text'])
        q['correct'] = q['correctAnswer'] == q['answer']

    # строим экспорт для студента
    sdata = NewRecord(username)
    sdata['subTasks'] = [NewSubTask(q) for q in test]

    # вычисляем оценку
    total = len(test)
    correct = 0
    for q in test:
        correct += q['correct'] # note: 0 = False, 1 = True
    sdata['mark'] = correct / total

    # добавляем ученика в конечный массив
    data.append(sdata)

print(jd(data, indent=4, sort_keys=False))
requests.post('http://localhost:1338/dbappend', json=data) # шлем на сервер