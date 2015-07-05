var agilenizer = require('../')
var test = require('tape')
var fs = require('fs')

test('can create identity', function (t) {
  var person = agilenizer.newIdentity({
    name: 'Dan',
    dimensions: ['Android', 'iOS', 'UI', 'API']
  })

  t.ok(person, 'returns object')

  var task = person.completed(['Android', 'UI'])
  t.equal(task.has.Android, 1, 'Android incremented')
  t.equal(task.has.UI, 1, 'UI incremented')
  t.equal(task.has.iOS, 0, 'iOS was not incremented')
  t.equal(task.has.API, 0, 'API was not incremented')

  t.end()
})

test('identity.completed() accepts unformatted strings', function (t) {
  var person = agilenizer.newIdentity({
    name: 'Dan',
    dimensions: ['Android', 'iOS', 'UI', 'API']
  })

  var task = person.completed('Android API Haha')
  t.ok(task)

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

test('identity.velocityFor(query) returns velocity object', function (t) {
  var person = agilenizer.newIdentity({
    name: 'Dan',
    dimensions: ['Android']
  })

  // Training
  person.completed(['Android'], {ratio: 1})

  var nullVelocity = person.velocityFor('Android')
  t.equal(nullVelocity.avg, 0, 'First velocity average is 0')
  t.equal(nullVelocity.last, 1, 'first "last" velocity is the first ratio')

  person.completed(['Android'], {ratio: 1.1})

  var firstVelocity = person.velocityFor('Android')
  t.ok(firstVelocity.avg < 0.1000001, 'Average velocity is correct 1')
  t.ok(firstVelocity.avg > 0.099999, 'Average velocity is correct 2')
  t.ok(firstVelocity.last < 0.10001, 'last velocity set 1')
  t.ok(firstVelocity.last > 0.09999, 'last velocity set 2')

  person.completed(['Android'], {ratio: 1.25})

  var secondVelocity = person.velocityFor('Android')
  t.notEqual(secondVelocity.avg, 0.1, 'Average velocity changes')
  t.equal(secondVelocity.avg, 0.125, 'Average velocity changes correctly')
  t.ok(secondVelocity.last < 0.15, 'Last velocity updates 1')
  t.ok(secondVelocity.last > 0.1499999, 'Last velocity updates 1')

  t.end()
})
