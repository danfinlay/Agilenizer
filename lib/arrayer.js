module.exports = taskArrayFromCompleted

function taskArrayFromCompleted (completed) {
  var result
  var self = this
  var insensitive = this.caseInsensitive

  if (Array.isArray(completed)) {
    result = completed.map(function (word) {
      return insensitive ? word.toLowerCase() : word
    })

  // Supports submitting a task string with task words in it:
  } else if (typeof completed === 'string') {
    var words = completed.split(/ |:|-/)
    var validWords = words.reduce(function (valid, word) {
      // Enumerate dimensions
      for (var i = 0; i < self.dimensions.length; i++) {
        var dimension = self.dimensions[i]

        var isValid = insensitive ? word.toLowerCase() === dimension : word === dimension
        if (isValid) {
          valid.push(dimension)
          return valid
        }
      }
      return valid
    }, [])

    result = validWords
  }

  return result
}
