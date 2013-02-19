var range = function(from, to, fill) {
    var result = [];
    for (var i = from; i < to; i++) {
        result[i] = fill(i);
    }
    return result;
};

Array.prototype.asMap = function(keyMapper, valueMapper) {

    var defaultMapper = function(item) { return item; }

    keyMapper = keyMapper || defaultMapper;
    valueMapper = valueMapper || defaultMapper;

    var result = {};
    this.forEach(function(item) {
        result[keyMapper(item)] = valueMapper(item);
    });
    return result;
};

NodeList.prototype.asArray = function() {
    var self = this;
    return range(0, self.length, function (i) {
        return self.item(i);
    });
};

String.prototype.chars = function() {
    var self = this;
    return range(0, self.length, function (i) {
        return self.charAt(i);
    });
};

var Nobirds = Nobirds || {};

Nobirds.LetterPress = {
    getGameId: function () {
        return /\/game\/play\/(\d+)/.exec(document.location.pathname)[1];
    },
    Letters: function () {

        var self = this;

        var letterElements = range(0, 25, function (i) {
            return document.getElementById('letter' + i);
        });

        var letters = letterElements.map(function(item) {
            return item.textContent;
        });

        var copy = function () {
            var result = {};
            letters.forEach(function(letter) {
                if(!result[letter]) {
                    result[letter] = 1;
                } else {
                    result[letter]++;
                }
            });

            return result;
        };

        var copyElements = function() {
            var result = {};
            letterElements.forEach(function(element) {
                var letter = element.textContent;

                if(!result[letter]) {
                    result[letter] = [element];
                } else {
                    result[letter].push(element);
                }
            });

            return result;
        };


        this.check = function (word) {
            var letters = copy();
            for(var i = 0; i < word.length; i++) {
                var ch = word.charAt(i);
                if(letters[ch]) {
                    letters[ch]--;
                } else {
                    return false;
                }
            }

            return true;
        };

        this.checkAll = function(words) {
            return words.some(function (item) {
                return self.check(item);
            });
        };

        this.select = function(word) {
            var elements = copyElements();

            word.chars().forEach(function(letter) {
                var letterElements = elements[letter];
                var element = letterElements[0];
                elements[letter] = letterElements.slice(1);
                element.click();
            });
        };

        this.selectedLettersElements = function() {
            return document
                .getElementsByClassName("wordLetter")
                .asArray();
        };

        this.removeSelected = function() {
            self.selectedLettersElements().forEach(function (element) {
                element.click();
            });
        };
    },

    Words: function() {
        var self = this;

        var findMovies = function(id) {
            return document
                .getElementById(id)
                .childNodes.asArray()
                .map(function (element) {
                    return element.textContent;
                }).asMap();
        };


        var hostWords = findMovies('hostmoves');
        var guestWords = findMovies('guestmoves');

        this.contains = function(word) {
            return hostWords[word] || guestWords[word];
        };

        this.containsAny = function(words) {
            return words.some(function(item) {
                return self.contains(item);
            })
        };
    },
    Panel: function () {
        var self = this;

        var gameId = Nobirds.LetterPress.getGameId();

        var splitWords = function(words) {
            return words
                .split(/[\s,]/)
                .map(function (item) { return item.trim().toLocaleLowerCase() })
                .filter(function(item) { return item.length });
        };

        var createWordsList = function () {
            var wordsList = document.createElement('div');
            wordsList.id = 'letterpress-plugin-words-list';

            var wordsHeader = document.createElement('div');
            var input = document.createElement('input');

            input.addEventListener('keydown', function (event) {
                if (event.keyCode == 13) {
                    var words = splitWords(input.value);

                    if(!letters.checkAll(words)) {
                        // smoke.signal('Нет нужных букв', 2000);
                        return true;
                    }

                    if(storage.containsAny(words)) {
                        return true;
                    }

                    if(usedWords.containsAny(words)) {
                        // smoke.signal('Слово уже использовано', 2000);
                        return true;
                    }

                    addAll(words);

                    input.value = '';

                    return false;
                }
                return true;
            });

            wordsHeader.appendChild(input);

            wordsHeader.appendChild(createRemoveAll());

            wordsList.appendChild(wordsHeader);

            return wordsList;
        };

        var createWord = function (parent, word) {
            var wordBlock = document.createElement('span');
            wordBlock.className = 'letterpress-plugin-word-block';

            var wordElement = document.createElement('span');
            wordElement.className = 'letterpress-plugin-word';
            wordElement.textContent = word;
            wordElement.addEventListener('click', function () {
                letters.select(word);
            });

            wordBlock.appendChild(wordElement);

            var selectLink = document.createElement('span');
            selectLink.addEventListener('click', function() {
                parent.removeChild(wordBlock);
                storage.deleteStoredWord(word);
            });
            selectLink.textContent = " X ";
            selectLink.className = 'letterpress-plugin-word-remove';

            wordBlock.appendChild(selectLink);

            return wordBlock;
        };

        var createRemoveAll = function() {
            var removeAllElement = document.createElement('div');
            removeAllElement.className = "letterpress-plugin-remove-all";
            removeAllElement.textContent = '-';
            removeAllElement.addEventListener("click", function () {
                letters.removeSelected();
            });

            return removeAllElement;
        };

        var wordsListHtml = createWordsList();

        var letters = new Nobirds.LetterPress.Letters();
        var usedWords = new Nobirds.LetterPress.Words();

        var storage = new Nobirds.LetterPress.Storage(gameId);

        this.installTo = function (element) {
            element.appendChild(wordsListHtml);
        };


        var add = function (word) {
            wordsListHtml.appendChild(createWord(wordsListHtml, word));
        };

        var addAll = function (words) {
            words.forEach(function (item) {
                storage.addStoredWord(item);
                add(item);
            });
        };

        storage.getStoredWords().forEach(function (word) {
            if(usedWords.check(word) && letters.check(word)) {
                add(word);
            }
        });

        return this;
    },


    Storage: function (gameId) {
        var parseWords = function (wordsList) {
            return wordsList ? wordsList.split(",").asMap() : {};
        };

        var serializeWords = function (words) {
            if (!words) {
                return "";
            }

            return Object.keys(words).join(",");
        };

        var storage = window.localStorage;

        var wordsStorageKey = "words-" + gameId;

        var words = parseWords(storage.getItem(wordsStorageKey));

        var saveWords = function () {
            storage.setItem(wordsStorageKey, serializeWords(words));
        };

        this.getStoredWords = function () {
            return Object.keys(words);
        };

        this.addStoredWord = function (word) {
            words[word] = word;
            saveWords();
        };

        this.deleteStoredWord = function (word) {
            delete words[word];
            saveWords();
        };

        this.containsAny = function(items) {
            return items.some(function(word) {
                return words[word];
            });
        };

        return this;
    }

};

document.addEventListener('DOMContentLoaded', function () {
    new Nobirds.LetterPress.Panel()
        .installTo(document.querySelector('body'));
});

