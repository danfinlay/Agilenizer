var _ = require('lodash')
var taskArrayize = require('./arrayer')

module.exports = Identity

function Identity (opts) {
  if (!opts) opts = {}

  this.name = opts.name || 'Unnamed'
  this.dimensions = opts.dimensions || []
  this.experienced = []

  if (opts.caseInsensitive) {
    this.caseInsensitive = true
    this.dimensions = this.dimensions.map(function (dimension) {
      return dimension.toLowerCase()
    })
  }

  var has = this.dimensions.reduce(function (has, next) {
    has[next] = 0
    return has
  }, {})
  this.emptyTask = {
    has: has,
    stats: {
      taken: 1,
      expected: 1,
      ratio: 1
    }
  }

  this.tasks = []

  this.record = {}

}

Identity.prototype.completed = function (completed, opts) {
  if (!opts) {
    opts = {}
  }
  if (!opts.taken) {
    opts.taken = 1
  }

  if (!opts.expected) {
    opts.expected = 1
  }

  opts.ratio = opts.ratio || opts.taken / opts.expected

  var task = _.cloneDeep(this.emptyTask)
  task.stats = opts

  var taskArr = taskArrayize.bind(this)(completed)
  this.updateExperienced(taskArr)
  updateTaskWithArr(taskArr)

  function updateTaskWithArr (arr) {
    arr.forEach(function (completed) {
      task.has[completed] = 1
    })
  }

  this.logTask(task)

  return task

}

Identity.prototype.updateExperienced = function (experienced) {
  var self = this

  experienced.forEach(function (word) {
    if (self.experienced.indexOf(word) === -1) {
      self.experienced.push(word)
    }
  })
}

Identity.prototype.logTask = function (task) {
  var usedKeys = usedTaskKeysFromTask(task)
  var key = stringKeys(usedKeys)

  if (!this.record[key]) {
    this.record[key] = {
      examples: 0,
      avg: 0
    }
  }

  var avg = this.record[key].avg || 0
  var examples = this.record[key].examples

  this.record[key].avg = (avg * examples + task.stats.ratio) / (examples + 1)
  this.record[key].examples++

}

function usedTaskKeysFromTask (task) {
  var keys = Object.keys(task.has)
  return keys.filter(function (key) {
    return task.has[key] > 0
  })
}

function stringKeys (keys) {
  return keys.sort(function (a, b) {
    if (a.name > b.name) {
      return 1
    }
    if (a.name < b.name) {
      return -1
    }
    // a must be equal to b
    return 0
  }).join()
}

Identity.prototype.guessFor = function (completed) {
  var self = this

  var dimensions = taskArrayize.bind(this)(completed)
  dimensions = dimensions.filter(function (dimension) {
    return self.experienced.indexOf(dimension) !== -1
  })
  var keyTypes = this.keyTypesForDimensions(dimensions) // Types to average

  var typeAverages = keyTypes.map(function (keyType) {
    return self.record[keyType].avg
  })

  return typeAverages.reduce(function (sum, thisOne) {
    return sum + thisOne
  }, 0) / typeAverages.length

}

Identity.prototype.keyTypesForDimensions = function (dimensions) {
  var keyTypes = []

  for (var key in this.record) {
    if (keyTypes.indexOf(key) === -1 && this.keyHasAllDimensions(key, dimensions)) {
      keyTypes.push(key)
    }
  }

  return keyTypes
}

Identity.prototype.keyHasAllDimensions = function (key, dimensions) {
  return dimensions.reduce(function (stillMatches, dimension) {
    return stillMatches && key.indexOf(dimension) !== -1
  }, true)
}

Identity.prototype.serialize = function () {
  return JSON.stringify({
    name: this.name,
    dimensions: this.dimensions,
    record: this.record,
    caseInsensitive: this.caseInsensitive
  }, null, 2)
}

Identity.prototype.load = function (json) {
  var opts = JSON.parse(json)
  this.name = opts.name
  this.dimensions = opts.dimensions
  this.record = opts.record
  this.caseInsensitive = opts.caseInsensitive || false
}

Identity.prototype.remove = function (completed, opts) {
  var taskArr = taskArrayize.bind(this)(completed || '')
  var recordKey = taskArr.join()

  var record = this.record[recordKey] || _.cloneDeep(this.emptyTask)

  record.avg = ((record.avg * record.examples) - (opts.ratio || 1)) / --record.examples
}
