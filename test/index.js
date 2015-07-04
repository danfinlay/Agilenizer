var agilenizer = require('../')
var test = require('tape')
var fs = require('fs')

test('can create identity', function (t) {
  var person = agilenizer.newIdentity({
    name: 'Dan',
    dimensions: ['Android', 'iOS', 'UI', 'API']
  })

  t.ok(person, 'msgs')

  var task = person.completed(['Android', 'UI'])
  t.equal(task.has.Android, 1)
  t.equal(task.has.UI, 1)
  t.equal(task.has.iOS, 0)
  t.equal(task.has.API, 0)

  task = person.completed(['Android', 'API'])
  t.equal(task.has.Android, 1)
  t.equal(task.has.UI, 0)
  t.equal(task.has.iOS, 0)
  t.equal(task.has.API, 1)

  // Even works with a string that only matches some dimensions:
  task = person.completed('Android API Haha')
  t.equal(task.has.Android, 1)
  t.equal(task.has.UI, 0, 'Android UI should have no API')
  t.equal(task.has.iOS, 0)
  t.equal(task.has.API, 1)

  t.end()

})

test('identity.completed() influences odds predictably', function (t) {
  var person = agilenizer.newIdentity({
    name: 'Dan',
    dimensions: ['Android', 'iOS', 'Stripe', 'UI', 'API'],
    caseInsensitive: true
  })

  // Training
  person.completed(['Android', 'UI'], {ratio: 1.5})
  person.completed(['Android', 'API'], {ratio: 1.8})
  person.completed('iOS UI-Whatever works!', {ratio: 0.25})
  person.completed('iOS API thingie!', {ratio: 0.5})
  person.completed('iOS UI: Special mission', {ratio: 0.5})
  var preProjection = person.guessFor('iOS API')
  person.completed(['iOS', 'API'], {ratio: 0.75})

  var projection = person.guessFor('iOS ui')
  t.equals(projection, 0.375, 'Respects case insensitivity')

  projection = person.guessFor('Android UI')
  t.equals(projection, 1.5)

  // When only one dimension has been experienced,
  // all combinations that match the remaining dimensions
  // are themselves averaged, and then averaged as a group.
  //
  // So in this case, since there is no "Stripe" experience,
  // we find "Android API" and "iOS API" to be the
  // most relevant.
  //
  // We then find the averages for each of those types of
  // experience, and then average them together.
  //
  // Android       iOS      avg
  // ((1.5)/1 + (0.25 + 0.5) / 2) / 2
  projection = person.guessFor('Stripe API')
  t.equals(projection, 1.2125)

  person.remove('iOS API', {ratio: 0.75})
  var latest = person.guessFor('iOS API')

  t.equals(latest, preProjection, 'ident.remove() reverted stats correctly')

  t.end()
})

test('identity.serialize() serializes json', function (t) {
  var person = agilenizer.newIdentity({
    name: 'Dan',
    dimensions: ['Android', 'iOS', 'Stripe', 'UI', 'API']
  })

  // Training
  person.completed(['Android', 'UI'], {ratio: 1.5})
  person.completed(['Android', 'API'], {ratio: 1.8})
  person.completed(['iOS', 'UI'], {ratio: 0.25})
  person.completed(['iOS', 'API'], {ratio: 0.5})
  person.completed(['iOS', 'UI'], {ratio: 0.5})
  person.completed(['iOS', 'API'], {ratio: 0.75})

  var json = person.serialize()

  t.ok(json, 'identity.serialize() produces json')
  fs.writeFileSync(__dirname + '/sample.json', json)
  t.end()

})

test('identity.load(json) deserializes json', function (t) {
  var person = agilenizer.newIdentity()

  var json = fs.readFileSync(__dirname + '/sample.json').toString()

  person.load(json)

  t.equal(person.record['Android,UI'].avg, 1.5, 'Android UI has same experience')
  t.equal(person.record['iOS,UI'].avg, 0.375, 'iOS UI has same experience')
  t.equal(person.record['iOS,API'].avg, 0.625, 'iOS UI has same experience')

  t.end()
})
