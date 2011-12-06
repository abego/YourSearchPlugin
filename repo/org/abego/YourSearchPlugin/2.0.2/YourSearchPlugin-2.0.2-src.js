/***
|''Name:''|YourSearchPlugin|
|''Version:''|2.0.2 (2006-02-13)|
|''Source:''|http://tiddlywiki.abego-software.de/#YourSearchPlugin|
|''Author:''|UdoBorkowski (ub [at] abego-software [dot] de)|
|''Licence:''|[[BSD open source license]]|
|''TiddlyWiki:''|2.0|
|''Browser:''|Firefox 1.0.4+; Firefox 1.5; InternetExplorer 6.0|
<<tiddler [[YourSearch Introduction]]>>
For more information see [[Help|YourSearch Help]].

!Compatibility
This plugin requires TiddlyWiki 2.0. 
Use http://tiddlywiki.abego-software.de/#YourSearchPlugin-1.0.1 for older TiddlyWiki versions.

!Revision history
* v2.0.2 (2006-02-13)
** Bugfix for Firefox 1.5.0.1 related to the "Show prefix" checkbox. Thanks to Ted Pavlic for reporting and to BramChen for fixing. 
** Internal
*** Make "JSLint" conform
* v2.0.1 (2006-02-05)
** Support "Exact Word Match" (use '=' to prefix word)
** Support default filter settings (when no filter flags are given in search term)
** Rework on the "less than 3 chars search text" feature (thanks to EricShulman)
** Better support SinglePageMode when doing "Open all tiddlers" (thanks to EricShulman)
** Support Firefox 1.5.0.1
** Bug: Fixed a hilite bug in "classic search mode" (thanks to EricShulman)
* v2.0.0 (2006-01-16)
** Add User Interface
* v1.0.1 (2006-01-06)
** Support TiddlyWiki 2.0
* v1.0.0 (2005-12-28)
** initial version
/%
***/
//{{{
//============================================================================
//============================================================================
//                           YourSearchPlugin
//============================================================================
//============================================================================

// Ensure that the Plugin is only installed once.
//
if (!version.extensions.YourSearchPlugin) {

version.extensions.YourSearchPlugin = {
	major: 2, minor: 0, revision: 2,
	date: new Date(2006, 2, 13), 
	type: 'plugin',
	source: "http://tiddlywiki.abego-software.de/#YourSearchPlugin"
};

var alertAndThrow = function(msg) {alert(msg);throw msg;};

if (!window.abego) window.abego = {};
if (abego.YourSearch) alertAndThrow("abego.YourSearch already defined");
abego.YourSearch = {};

if (version.major < 2) alertAndThrow("YourSearchPlugin requires TiddlyWiki 2.0 or newer.\n\nGet YourSearch 1.0.1 to use YourSearch with older versions of TiddlyWiki.\n\nhttp://tiddlywiki.abego-software.de/#YourSearchPlugin-1.0.1");

//----------------------------------------------------------------------------
// The STQ (SimpleTiddlerQuery) Class
//----------------------------------------------------------------------------

// Internal.
// 
var STQ = function(queryText, caseSensitive, matchTitleOnly, useRegExp) {
	this.queryText = queryText;
	this.caseSensitive = caseSensitive;

	if (useRegExp) {
		this.regExp = new RegExp(queryText, caseSensitive ? "mg" : "img");
		return;
	}
	
	this.terms = [];

	// The regular expression that matches a single search term of the form
	// (whitespace handling and grouping omitted for clarity):
	//
	//	 -?[#!%]*(<doubleQuoteStringLiteral>|<wordWithoutSpace>) (AND|OR)?
	//
	// group 1: '-'  (negate, optional)
	// group 2: [!%#]* (may be empty)
	// group 3: String literal "..."
	// group 4: word
	// group 5: AND / OR (optional) 
	//
	// (group 3 xor group 4 is defined)
	//
	var re = /\s*(\-)?([#%!=]*)(?:(?:("(?:(?:\\")|[^"])*")|(\S+)))(?:\s+((?:[aA][nN][dD])|(?:[oO][rR]))(?!\S))?/mg;

	var matches = re.exec(queryText);

	while (matches != null && matches.length == 6) {
		var negate = '-' == matches[1];
		var flags = matches[2];
		var inTitle = flags.indexOf('!') >= 0;
		var inText = flags.indexOf('%') >= 0;
		var inTag = flags.indexOf('#') >= 0;
		var wordMatch = flags.indexOf('=') >= 0;
		if (!inTitle && !inText && !inTag) {
			inTitle = config.options.chkSearchInTitle;
			inText = config.options.chkSearchInText;
			inTag = config.options.chkSearchInTags;
			
			// If all settings are off (i.e. all results would be empty, 
			// i.e user error or checkboxes are gone) set all settings
			if (!inTitle && !inText && !inTag) {
				inTitle = inText = inTag = true;
			}
		}
		if (matchTitleOnly) {
			inText = false;
			inTag = false;
		}
		
		var text;
		if (matches[3]) {
			//Quoted String
			try {
				text = eval(matches[3]);
			} catch (ex) {
			    // ignore error. Will be handled right after this.
			}
		} else {
			text = matches[4];
		}
		if (!text) {
			throw "Invalid search expression: %0".format([queryText]);
		}
		var orFollows = matches[5] && matches[5].charAt(0).toLowerCase() == 'o';
		this.terms.push(new STQ.Term(text, inTitle, inText, inTag, negate, orFollows, caseSensitive, wordMatch));
		
		matches = re.exec(queryText);
	}
};

var me = STQ.prototype;

// Internal.
// 
// Returns an array with those tiddlers from the tiddlersMap that 
// match the query.
//
me.getMatchingTiddlers = function(tiddlersMap) {
	var result = [];
	for (var i in tiddlersMap) {
		var t = tiddlersMap[i];
		if ((t instanceof Tiddler) && this.matchesTiddler(t)) {
			result.push(t);
		}
	}
	return result;
};


// Internal.
// 
// Returns true if the query has a match in the given tiddler.
//
// @param tiddler [may be null]
//
me.matchesTiddler = function(tiddler) {
	if (this.regExp) {
		return this.regExp.test(tiddler.title) || this.regExp.test(tiddler.text);
	}
	
	var n = this.terms.length;
	if (n == 0) {
		return false;
	}
	
	var hasMatch = this.terms[0].matchesTiddler(tiddler);
	for (var i = 1; i < this.terms.length; i++) {
		if (this.terms[i-1].orFollows) {
			// the OR case.
			
			// shortcut: when the first operand of an OR is true 
			// we don't need to evaluate the second operand since 
			// the result of the OR will always be true.
			
			// In the other case we actually to the "OR"
			if (!hasMatch) {
				hasMatch |= this.terms[i].matchesTiddler(tiddler);
			}
		} else {
			// the AND case.
			
			// shortcut: when the first operand of an AND is false 
			// we don't need to evaluate the second operand since
			// the result of the AND will always be false.
			
			// Otherwise we actually to the "AND"
			if (hasMatch) {
				hasMatch &= this.terms[i].matchesTiddler(tiddler);
			}
		}
	}
	return hasMatch;
};

// Internal.
// 
me.getOnlyMatchTitleQuery = function() {
	if (!this.onlyMatchTitleQuery) {
		this.onlyMatchTitleQuery = new STQ(this.queryText, this.caseSensitive, true, this.useRegExp);
	}
	return this.onlyMatchTitleQuery;
};


// Returns a regular expression that can be used to marking/hiliting
// matches in the text.
//
// @return [may be null] null when the query does not provide marking information.
//
me.getMarkRegExp = function() {
	if (this.regExp) {
		// Only use the regExp for marking when it does not match the empty string.
		return "".search(this.regExp) >= 0 ? null :  this.regExp;
	}
	
	var stringSet =  {};
	var n = this.terms.length;
	for (var i = 0; i < this.terms.length; i++) {
		var term = this.terms[i];
		if (!term.negate) stringSet[term.text] = true;
	}

	var pattern = [];
	for (var t in stringSet) pattern.push("(" + t.escapeRegExp() + ")");
	
	if (pattern.length == 0) return null;

	var joinedPattern = pattern.join("|");
	return new RegExp(joinedPattern, this.caseSensitive ? "mg" : "img");
};

// Internal.
// 
me.toString = function() {
	if (this.regExp) {
		return this.regExp.toString();
	}
	
	var result = "";
	for (var i = 0; i < this.terms.length; i++) {
		result += this.terms[i].toString();
	}
	return result;
};

//----------------------------------------------------------------------------
// The STQ.Term Class
//----------------------------------------------------------------------------

// Internal.
//
STQ.Term = function(text, inTitle, inText, inTag, negate, orFollows, caseSensitive, wordMatch) {
	this.text = text;
	this.inTitle = inTitle;
	this.inText = inText;
	this.inTag = inTag;
	this.negate = negate;
	this.orFollows = orFollows;
	this.caseSensitive = caseSensitive;
	this.wordMatch = wordMatch;
	
	var reText = text.escapeRegExp();
	if (this.wordMatch) reText = "\\b"+reText+"\\b";
	this.regExp = new RegExp(reText, "m"+(caseSensitive ? "" : "i"));
};

// Internal.
//
STQ.Term.prototype.toString = function() {
	return (this.negate ? "-" : "")+(this.inTitle ? "!" : "")+(this.inText? "%" : "")+(this.inTag? "#" : "")+(this.wordMatch ? "=" : "")+'"'+this.text+'"'+ (this.orFollows ? " OR " : " AND ");
};

// Internal.
//
// Returns true if the term has a match in the given tiddler.
//
// @param tiddler [may be null]
//
STQ.Term.prototype.matchesTiddler = function(tiddler) {
	if (!tiddler) {
		return false;
	}
	
	if (this.inTitle && this.regExp.test(tiddler.title)) {
		return !this.negate;
	}
	if (this.inText && this.regExp.test(tiddler.text)) {
		return !this.negate;
	}
	if (this.inTag) {
		var tags = tiddler.tags;
		if (tags) {
			for (var i = 0; i < tags.length; i++) {
				if (this.regExp.test(tags[i])) {
					return !this.negate;
				}
			}
		}
	}
	
	return this.negate;
};

//----------------------------------------------------------------------------
// Utils
//----------------------------------------------------------------------------

var stringToInt = function(s, defaultValue) {
	if (!s) return defaultValue;
	var n = parseInt(s);
	return (n == NaN) ? defaultValue : n;
};

var getIntAttribute = function(elem, name, defaultValue) {
	return stringToInt(elem.getAttribute(name));
};

// Returns true if e is either self or a descendant (child, grandchild,...) of self.
//
// @param self DOM:Element
// @param e DOM:Element or null
//
var isDescendantOrSelf = function(self, e) {
	while (e != null) {
		if (self == e) return true;
		e = e.parentNode;
	}
	return false;
};

var getMatchCount = function(s, re) {
	var m = s.match(re);
	return m ? m.length : 0;
};

var createEllipsis = function(place) {
	var e = createTiddlyElement(place,"span");
	e.innerHTML = "&hellip;";
};

var isWordChar = function(c) {
	return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c == "_";
};

// Returns the bounds of the word in s around offset as a {start: , end:} object.
//
// Returns null when the char at offset is not a word char.
//
var getWordBounds = function(s, offset) {
	// Handle the "offset is not in word" case
	if (!isWordChar(s[offset])) return null;

	for (var i = offset-1; i >= 0 && isWordChar(s[i]); i--) 
		{/*empty*/}
		
	var startIndex = i+1;
	var n = s.length;
	for (i = offset+1; i < n && isWordChar(s[i]); i++) 
		{/*empty*/}
	
	return {start: startIndex, end: i};
};


var removeTextDecoration = function(s) {
	var removeThis = ["''", "{{{", "}}}", "//", "<<<", "/***", "***/"];
	var reText = "";
	for (var i = 0; i < removeThis.length; i++) {
		if (i != 0) reText += "|";
		reText += "("+removeThis[i].escapeRegExp()+")";
	}
	return s.replace(new RegExp(reText, "mg"), "").trim();
};

var logText = "";
var lastLogTime = null;
var logMessage = function(kind, s) {
	var now = new Date();
	var delta = lastLogTime ? (now-lastLogTime).toString() : "";
	logText += "<tr><td>"+now.convertToYYYYMMDDHHMMSSMMM()+"</td><td align='right'>"+delta+"</td><td>"+kind+"</td><td>"+s.htmlEncode()+"</td></tr>\n";
	lastLogTime = now;
};

function writeLog() {
	var t = " <<JsDoIt 'WriteLog' 'WriteLog' 'javascript:writeLog();story.closeTiddler(\"Log\");story.displayTiddler(null,\"Log\");'>>"+
	"<html><table><tbody><tr><th>Time</th><th>Delta (ms)</th><th>Kind</th><th>Message</th></tr>\n" + logText + "</tbody></table></html>";
	store.saveTiddler("Log", "Log",t,config.options.txtUserName,new Date(),["System", "Log"]);
	logText = "";
	lastLogTime = null;
}

//----------------------------------------------------------------------------
// The Search Core
//----------------------------------------------------------------------------

// Constants

// DOM IDs
var yourSearchResultID = "yourSearchResult";
var yourSearchResultItemsID = "yourSearchResultItems";

// Visual appearance of the result page
var maxCharsInTitle = 80;
var maxCharsInTags = 50;
var maxCharsInText = 250;
var maxPagesInNaviBar = 10; // Maximum number of pages listed in the navigation bar (before or after the current page)

var itemsPerPageDefault = 25; // Default maximum number of items on one search result page
var itemsPerPageWithPreviewDefault = 10; // Default maximum number of items on one search result page when PreviewText is on

// Context Calculation
var minMatchWithContextSize = 40; 
var maxMovementForWordCorrection = 4; // When a "match" context starts or end on a word the context borders may be changed to at most this amound to include or exclude the word.

// Ranking Weights
var matchInTitleWeight = 4;
var precisionInTitleWeight = 10;
var matchInTagsWeight = 2;

// Variables
var resultElement; // The (popup) DOM element containing the search result [may be null]
var lastResults; // Array of tiddlers that matched the last search
var lastQuery; // The last Search query (STQ)
var lastSearchText; // The last search text, as used to create the lastQuery
var searchInputField; // The "search" input field
var searchButton; // The "search" button
var firstIndexOnPage = 0; // The index of the first item of the lastResults list displayed on the search result page

var currentTiddler; // While creating the search result page the tiddler that is currently rendered.
var indexInPage; // The index (in the current page) of the tiddler currently rendered.
var indexInResult; // The index (in the result array) of the tiddler currently rendered.


var getItemsPerPage = function() {
	var n = (config.options.chkPreviewText) 
			? stringToInt(config.options.txtItemsPerPageWithPreview, itemsPerPageWithPreviewDefault) 
			: stringToInt(config.options.txtItemsPerPage, itemsPerPageDefault);
	return (n > 0) ? n : 1;
};

var standardRankFunction = function(tiddler, query) {	
	// Count the matches in the title and the tags
	var markRE = query.getMarkRegExp();
	if (!markRE) return 1;
	
	var matchesInTitle = tiddler.title.match(markRE);
	var nMatchesInTitle =  matchesInTitle ? matchesInTitle.length : 0;
	var nMatchesInTags = getMatchCount(tiddler.getTags(), markRE);

	// Calculate the "precision" of the matches in the title as the ratio of
	// the length of the matches to the total length of the title.
	var lengthOfMatchesInTitle = matchesInTitle ? matchesInTitle.join("").length : 0;
	var precisionInTitle = tiddler.title.length > 0 ? lengthOfMatchesInTitle/tiddler.title.length : 0;
	
	// calculate a weighted score
	var rank= nMatchesInTitle * matchInTitleWeight 
			+ nMatchesInTags * matchInTagsWeight 
			+ precisionInTitle * precisionInTitleWeight 
			+ 1;

	return rank;
};

// @return Tiddler[]
//
var findMatches = function(store, searchText,caseSensitive,useRegExp,sortField,excludeTag) {
	lastSearchText = searchText;

	var candidates = store.reverseLookup("tags",excludeTag,false);
	var query = new STQ(searchText,caseSensitive, false, useRegExp); 
	lastQuery = query;

	var results = query.getMatchingTiddlers(candidates);

	// Rank the results
	var rankFunction = abego.YourSearch.getRankFunction();
	for (var i = 0; i < results.length; i++) {
		var tiddler = results[i];
		var rank = rankFunction(tiddler, query);
		// Add the rank information to the tiddler.
		// This is used during the sorting, but it may also
		// be used in the result, e.g. to display some "relevance" 
		// information in the result	
		tiddler.searchRank = rank;	
	}
	
	// sort the result, taking care of the rank and the sortField	
	if(!sortField) {
		sortField = "title";
	}
	
	var sortFunction = function (a,b) {
		var searchRankDiff = a.searchRank - b.searchRank;
		if (searchRankDiff == 0) {
			if (a[sortField] == b[sortField]) {
				return(0); 
			} else {
				return (a[sortField] < b[sortField]) ? -1 : +1; 
			}
		} else {
			return (searchRankDiff > 0) ? -1 : +1; 
		}
	};
	results.sort(sortFunction);
	
	lastResults = results;
	
	return results;
};


//----------------------------------------------------------------------------
// Handling "limited marked text" in the preview
//
// The found/matched texts should be displayed to the user in the preview. To make 
// it more useful the matched texts should be shown in their contexts, i.e. with
// some text around them. Since we only have limited space for the preview 
// (around two lines for the text preview, less for the tags and title) and 
// also don't want to both the user with "too much context" we use some 
// heuristics to find the "best context (size)". 
//
// On the other hand we want to use as much as possible of the preview area, 
// so if there is room left we also display as much text from the beginning
// of the text as possible. This gives the user some kind of "overall context"
// especiallay if the start of the text is introductorily.
//
// Text Ranges
//
// To represent the ranges that should be displayed "Range" object are used.
// This are objects with a "start" and "end" property. In a corresponding
// "Ranges array" these objects are sorted by their start and no range object 
// intersects/touches any other of the array.
//
//----------------------------------------------------------------------------

var moveToWordBorder = function(s, offset, isStartOffset) {
	var wordBounds;
	if (isStartOffset) {
		wordBounds = getWordBounds(s, offset);
	} else {
		if (offset <= 0) return offset;
		wordBounds = getWordBounds(s, offset-1);
	}
	if (!wordBounds) return offset;
	
	if (isStartOffset) {
		if (wordBounds.start >= offset-maxMovementForWordCorrection) return wordBounds.start;
		if (wordBounds.end <= offset+maxMovementForWordCorrection) return wordBounds.end;
	} else {
		if (wordBounds.end <= offset+maxMovementForWordCorrection) return wordBounds.end;
		if (wordBounds.start >= offset-maxMovementForWordCorrection) return wordBounds.start;
	}
	return offset;
};

var getContextRangeAround = function(s, startIndex, endIndex, matchCount, maxLen) {
	// Partition the available space into equal sized areas for each match and one 
	// for the text start.
	// But the size should not go below a certain limit
	var size = Math.max(Math.floor(maxLen/(matchCount+1)), minMatchWithContextSize);
	
	// Substract the size of the range to get the size of the context.
	var contextSize = Math.max(size-(endIndex-startIndex), 0);
	// Two thirds of the context should be before the match, one third after.
	var contextEnd = Math.min(Math.floor(endIndex+contextSize/3), s.length);
	var contextStart = Math.max(contextEnd - size, 0);

	// If the contextStart/End is inside a word and the end of the word is
	// close move the pointers accordingly to make the text more readable.
	contextStart = moveToWordBorder(s, contextStart, true);
	contextEnd = moveToWordBorder(s, contextEnd, false);
	
	return {start: contextStart, end: contextEnd};
};

// Splits s into a sequence of "matched" and "unmatched" substrings, using the 
// matchRegExp to do the matching.
// 
// Returns an array of objects with a "text" property containing the substring text. 
// Substrings that are "matches" also contain a boolean "isMatch" property set to true.
// 
// @param matchRegExp [may be null] when null no matching is performed and the returned 
// 			array just contains one item with s as its text
// 
var getTextAndMatchArray = function(s, matchRegExp) {
	var result = [];
	if (matchRegExp) {
		var startIndex = 0;
		var n = s.length;
		var currentLen = 0;
		do {
			matchRegExp.lastIndex = startIndex;
			var match = matchRegExp.exec(s);
			if (match) {
				if (startIndex < match.index) {
					var t = s.substring(startIndex, match.index);
					result.push({text:t});
				}
				result.push({text:match[0], isMatch:true});
				startIndex = match.index + match[0].length;
			} else {
				result.push({text: s.substr(startIndex)});
				break;
			}
		} while (true);
	} else {
		result.push({text: s});
	}
	return result;
};


var simpleCreateLimitedTextWithMarks = function(place, s, maxLen) {
	if (!lastQuery) return;
	
	var textAndMatches = getTextAndMatchArray(s, lastQuery.getMarkRegExp());
	var currentLen = 0;
	for (var i=0; i < textAndMatches.length && currentLen < maxLen; i++) {
		var t = textAndMatches[i];
		var text = t.text;
		if (t.isMatch) {
			createTiddlyElement(place,"span",null,"marked",text);		
		} else {
			var remainingLen = maxLen-currentLen;
			if (remainingLen < text.length) {
				text = text.substring(0, remainingLen)+"...";
			}
			createTiddlyText(place, text);
		}
		currentLen += text.length;
	}
};



var addRange = function(ranges, startIndex, endIndex) {
	var n = ranges.length;
	
	// When there are no ranges in ranges, just add it.
	if (n == 0) {
		ranges.push({start: startIndex, end: endIndex});
		return;
	}
	
	var i = 0;
	for (; i < n; i++) {
		var range = ranges[i];
		
		// find the first range that intersects or "touches" [startIndex, endIndex[
		if (range.start <= endIndex && startIndex <= range.end) {
			// Found.
			
			var r;
			// find the first range behind the new range that does not interfere
			var rIndex = i+1;
			for (; rIndex < n; rIndex++) {
				r = ranges[rIndex];
				if (r.start > endIndex || startIndex > range.end) {
					break;
				}
			}
			
			// Replace the ranges i to rIndex-1 with the union of the new range with these ranges.
			var unionStart = startIndex;
			var unionEnd = endIndex;
			for (var j = i; j < rIndex; j++) {
				r = ranges[j];
				unionStart = Math.min(unionStart, r.start);
				unionEnd = Math.max(unionEnd, r.end);
			}
			ranges.splice(i, rIndex-i, {start: unionStart, end: unionEnd});
			return;			
		}
		
		// if we found a range R that is right of the new range there is no
		// intersection and we can insert the new range before R.
		if (range.start > endIndex) {
			break;
		}
	}

	// When we are here the new range does not interfere with any range in ranges and
	// i is the index of the first range right to it (or ranges.length, when the new range
	// becomes the right most range). 

	ranges.splice(i, 0, {start: startIndex, end: endIndex});
};

var getTotalRangesSize = function(ranges) {
	var totalRangeSize = 0;
	for (var i=0; i < ranges.length; i++) {
		var range = ranges[i];
		totalRangeSize += range.end-range.start;
	}
	return totalRangeSize;
};

// Processes the text between startIndex and endIndex of the textAndMatches
// "writes" them (as DOM elements) at the given place, possibly as "marked" text.
//
// When endIndex is not the end of the full text an ellisis is appended. 
//
var writeTextAndMatchRange = function(place, s, textAndMatches, startIndex, endIndex) {
	var t;
	var text;
	
	// find the first text item to write
	var pos = 0;
	var i = 0;
	var offset = 0;
	for (;i < textAndMatches.length; i++) {
		t = textAndMatches[i];
		text = t.text;
		if (startIndex < pos+text.length) {
			offset = startIndex - pos;
			break;
		}
		pos += text.length;
	}
	
	var remainingLen = endIndex - startIndex;
	for (; i < textAndMatches.length && remainingLen > 0; i++) {
		t = textAndMatches[i];
		text = t.text.substr(offset);
		offset = 0;
		if (text.length > remainingLen) text = text.substr(0,remainingLen);
		
		if (t.isMatch) {
			createTiddlyElement(place,"span",null,"marked",text);
		} else {
			createTiddlyText(place, text);
		}
		remainingLen -= text.length;
	}
	
	if (endIndex < s.length) {
		createEllipsis(place);
	}
};

var getMatchedTextCount = function(textAndMatches) {
	var result = 0;
	for (var i=0; i < textAndMatches.length; i++) {
		if (textAndMatches[i].isMatch) {
			result++;
		}
	}
	return result;	
};

// Get all ranges around matched substrings with their contexts
//
var getMatchedTextWithContextRanges = function(textAndMatches, s, maxLen) {
	var ranges = [];
	var matchCount = getMatchedTextCount(textAndMatches);
	var pos = 0;
	for (var i=0; i < textAndMatches.length; i++) {
		var t = textAndMatches[i];
		var text = t.text;
		if (t.isMatch) {
			var range = getContextRangeAround(s, pos, pos+text.length, matchCount, maxLen);
			addRange(ranges, range.start, range.end);
		}
		pos += text.length;
	}
	return ranges;
};

var fillUpRanges = function(s, ranges, maxLen) {
	var remainingLen = maxLen - getTotalRangesSize(ranges);
	while (remainingLen > 0) {
		if (ranges.length == 0) {
			// No matches added yet. Make one large range.
			addRange(ranges, 0, moveToWordBorder(s, maxLen, false));
			return;
		} else {
			var range = ranges[0];
			var startIndex;
			var maxEndIndex;
			if (range.start == 0) {
				// The first range already starts at the beginning of the string.

				// When there is a second range fill to the next range start or to the maxLen.
				startIndex = range.end;
				if (ranges.length > 1) {
					maxEndIndex =  ranges[1].start;
				} else {
					// Only one range. Add a range after that with the complete remaining len 
					// (corrected to "beautify" the output)
					addRange(ranges, startIndex, moveToWordBorder(s, startIndex+remainingLen, false));
					return;
				}
			} else {
				// There is unused space between the start of the text and the first range.
				startIndex = 0;
				maxEndIndex = range.start;
			}
			var endIndex = Math.min(maxEndIndex, startIndex+remainingLen);
			addRange(ranges, startIndex, endIndex);
			remainingLen -= (endIndex-startIndex);
		}
	}
};

// Write the given ranges of s, using textAndMatches for marking portions of the text.
//
var writeRanges = function(place, s, textAndMatches, ranges, maxLen) {
	if (ranges.length == 0) return;
	
	// When the first range is not at the start of the text write an ellipsis("...")
	// (Ellipses between ranges are written in the writeTextAndMatchRange method)
	if (ranges[0].start > 0) createEllipsis(place);

	var remainingLen = maxLen;
	for (var i = 0; i < ranges.length && remainingLen > 0; i++) {
		var range = ranges[i];
		var len = Math.min(range.end - range.start, remainingLen);
		writeTextAndMatchRange(place, s, textAndMatches, range.start, range.start+len);
		remainingLen -= len;
	}
};

var createLimitedTextWithMarksAndContext = function(place, s, maxLen) {
	if (!lastQuery) return;
	
	if (s.length < maxLen) maxLen = s.length;
	
	var textAndMatches = getTextAndMatchArray(s, lastQuery.getMarkRegExp());
	
	var ranges = getMatchedTextWithContextRanges(textAndMatches, s, maxLen);
	
	// When the maxLen is not yet reached add more ranges 
	// starting from the beginning until either maxLen or 
	// the end of the string is reached.
	fillUpRanges(s, ranges, maxLen);

	writeRanges(place, s, textAndMatches, ranges, maxLen);
};

var createLimitedTextWithMarks = function(place, s, maxLen) {
//	return simpleCreateLimitedTextWithMarks(place, s, maxLen);
	return createLimitedTextWithMarksAndContext(place, s, maxLen);
};


//----------------------------------------------------------------------------
// The Search Result
//----------------------------------------------------------------------------

var myStorySearch = function(text,useCaseSensitive,useRegExp)
{
	highlightHack = new RegExp(useRegExp ? text:text.escapeRegExp(),useCaseSensitive ? "mg" : "img");
	var matches = findMatches(store, text,useCaseSensitive,useRegExp,"title","excludeSearch");

	firstIndexOnPage = 0;
	showResult();
	
	highlightHack = null;
};


var myMacroSearchHandler = function(place,macroName,params)
{
	var lastSearchText = "";
	var searchTimeout = null;
	var doSearch = function(txt)
		{
		if (config.options.chkUseYourSearch)
			myStorySearch(txt.value,config.options.chkCaseSensitiveSearch,config.options.chkRegExpSearch);
		else
			story.search(txt.value,config.options.chkCaseSensitiveSearch,config.options.chkRegExpSearch);
		lastSearchText = txt.value;
		};
	var clickHandler = function(e)
		{
		doSearch(searchInputField);
		return false;
		};
	var keyHandler = function(e)
		{
		if (!e) var e = window.event;
		switch(e.keyCode)
			{
			case 13:
				doSearch(this);
				break;
			case 27:
				// When the result is open, close it, 
				// otherwise clear the content of the input field
				if (isResultOpen()) {
					closeResult();
				} else {
					this.value = "";
					clearMessage();
				}
				break;
			}
		if (String.fromCharCode(e.keyCode) == this.accessKey || e.altKey) 
			{
			reopenResultIfApplicable();
			}

		if(this.value.length<3 && searchTimeout) clearTimeout(searchTimeout);
		if((this.value.length > 2) && (this.value != lastSearchText))
			if (!config.options.chkUseYourSearch || config.options.chkSearchAsYouType)
				{
				if(searchTimeout)
					clearTimeout(searchTimeout);
				var txt = this;
				searchTimeout = setTimeout(function() {doSearch(txt);},500);
				}
		if (this.value.length == 0) 
			{
			closeResult();
			}
		};


	var focusHandler = function(e)
		{
		this.select();
		reopenResultIfApplicable();
		};

	var btn = createTiddlyButton(place,this.label,this.prompt,clickHandler);
	var txt = createTiddlyElement(place,"input",null,null,null);
	if(params[0])
		txt.value = params[0];
	txt.onkeyup = keyHandler;
	txt.onfocus = focusHandler;
	txt.setAttribute("size",this.sizeTextbox);
	txt.setAttribute("accessKey",this.accessKey);
	txt.setAttribute("autocomplete","off");
	if(config.browser.isSafari)
		{
		txt.setAttribute("type","search");
		txt.setAttribute("results","5");
		}
	else
		txt.setAttribute("type","text");

	searchInputField = txt;
	searchButton = btn;
};

var isResultOpen = function() {
	return resultElement != null && resultElement.parentNode == document.body;
};

var closeResult = function() {
	if (isResultOpen()) {
		document.body.removeChild(resultElement);
	}
};


var openAllFoundTiddlers = function() {
	closeResult();
	if (lastResults) {
		var titles=[];
		for(var i = 0; i<lastResults.length; i++)
			titles.push(lastResults[i].title);
		story.displayTiddlers(null,titles);
	}
};

// Refreshes the content of the result with the current search result
// of the selected page.
//
// Assumes that the result is already open. 
//
var refreshResult = function() {
	if (!resultElement || !searchInputField) return;

	// Load the template for the YourSearchResult
	var html = store.getTiddlerText("YourSearchResultTemplate");
	if (!html) html = "<b>Tiddler YourSearchResultTemplate not found</b>";
	resultElement.innerHTML = html;

	// Ensure that the firstIndexOnPage is really a page start. 
	// This may have become violated when the ItemsPerPage are changed,
	// e.g. when switching between previewText and simple mode.
	firstIndexOnPage = Math.floor(firstIndexOnPage / getItemsPerPage()) * getItemsPerPage();
	
	// Expand the template macros etc.
	applyHtmlMacros(resultElement,null);
	refreshElements(resultElement,null);
	
	// When there are items found add them to the result page (pagewise)
	if (lastResults && lastResults.length > 0) {
		// Load the template how to display the items that represent a found tiddler
		var itemHtml = store.getTiddlerText("YourSearchItemTemplate");
		if (!itemHtml) alertAndThrow("YourSearchItemTemplate not found");
	
		// Locate the node that shall contain the list of found tiddlers
		var items = document.getElementById(yourSearchResultItemsID);
		if(!items)
			items = createTiddlyElement(resultElement,"div",yourSearchResultItemsID);

		// Add the items of the current page
		var endIndex = Math.min(firstIndexOnPage+getItemsPerPage(), lastResults.length);
		indexInPage = -1;
		for (var i=firstIndexOnPage; i < endIndex; i++) {
			currentTiddler = lastResults[i];
			indexInPage++;
			indexInResult = i;

			var item = createTiddlyElement(items,"div",null, "yourSearchItem");
			item.innerHTML = itemHtml;
			applyHtmlMacros(item,null);
			refreshElements(item,null);
		}
	}
	
	// The currentTiddler must only be defined while rendering the found tiddlers
	currentTiddler = null;

	ensureResultIsDisplayedNicely();
};

// Makes sure the result page has a good size and position and visible
// (may scroll the window)
//
var	ensureResultIsDisplayedNicely = function() {
	adjustResultPositionAndSize();
	scrollVisible();
};

var scrollVisible = function() {
	// Scroll the window to make the result page (and the search Input field) visible.
	if (resultElement) window.scrollTo(0,ensureVisible(resultElement));
	if (searchInputField) window.scrollTo(0,ensureVisible(searchInputField));
};

// Adjusts the resultElement's size and position, relative to the search input field.
//
var adjustResultPositionAndSize = function() {
	if (!searchInputField) return;
	
	var root = searchInputField;
	
	// Position the result below the root and resize it if necessary.
	var rootLeft = findPosX(root);
	var rootTop = findPosY(root);
	var rootHeight = root.offsetHeight;
	var popupLeft = rootLeft;
	var popupTop = rootTop + rootHeight;

	// Make sure the result is not wider than the window
	var winWidth = findWindowWidth();
	if (winWidth < resultElement.offsetWidth) {
		resultElement.style.width = (winWidth - 100)+"px";
		winWidth = findWindowWidth();
	}

	// Ensure that the left and right of the result are not
	// clipped by the window. Move it to the left or right, if necessary.	
	var popupWidth = resultElement.offsetWidth;
	if(popupLeft + popupWidth > winWidth)
		popupLeft = winWidth - popupWidth-30;
	if (popupLeft < 0) popupLeft = 0;
	
	// Do the actual moving
	resultElement.style.left = popupLeft + "px";
	resultElement.style.top = popupTop + "px";
	resultElement.style.display = "block";
};

var showResult = function() {
	if (!resultElement) {
		resultElement = createTiddlyElement(document.body,"div",yourSearchResultID,"yourSearchResult");
	} else if (resultElement.parentNode != document.body) {
		document.body.appendChild(resultElement);
	}

	refreshResult();
};

var	reopenResultIfApplicable = function() {
	if (searchInputField == null || !config.options.chkUseYourSearch) return;
	
	if ((searchInputField.value == lastSearchText) && lastSearchText && !isResultOpen()) {
		// For speedup we check re-use the previously created resultElement, if possible.
		if (resultElement && (resultElement.parentNode != document.body)) {
			document.body.appendChild(resultElement);
			ensureResultIsDisplayedNicely();
		} else {
			showResult();
		}
	}
};

var setFirstIndexOnPage = function(index) {
	if (!lastResults || lastResults.length == 0) return;

	firstIndexOnPage = Math.min(Math.max(0, index), lastResults.length-1);
	refreshResult();	
};


var onDocumentClick = function(e) {
	// Close the search result page when the user clicks on the document
	// (and not into the searchInputField, on the search button or in the result)
	if (e.target == searchInputField) return; 
	if (e.target == searchButton) return; 
	if (resultElement && isDescendantOrSelf(resultElement, e.target)) return; 
	
	closeResult();
};

var onDocumentKeyup = function(e) {
	// Close the search result page when the user presses "ESC"
	if (e.keyCode == 27) closeResult();
};
addEvent(document,"click",onDocumentClick);
addEvent(document,"keyup",onDocumentKeyup);


//----------------------------------------------------------------------------
// Macros
//----------------------------------------------------------------------------

// ====Macro yourSearch ================================================

config.macros.yourSearch = {
	// Standard Properties
	label: "yourSearch",
	prompt: "Gives access to the current/last YourSearch result",

	funcs: {},
	
	tests: {
		"true" : function() {return true;},
		"false" : function() {return false;},
		"found" : function() {return lastResults && lastResults.length > 0;},
		"previewText" : function() {return config.options.chkPreviewText;}
	}
};

config.macros.yourSearch.handler = function(place,macroName,params,wikifier,paramString,tiddler) {
	if (params.length == 0) return;

	var name = params[0];
	var func = config.macros.yourSearch.funcs[name];
	if (func) func(place,macroName,params,wikifier,paramString,tiddler);
};

config.macros.yourSearch.funcs.itemRange = function(place) {
	if (lastResults) {
		var endIndex = Math.min(firstIndexOnPage+getItemsPerPage(), lastResults.length);
		var s = "%0 - %1".format([firstIndexOnPage+1,endIndex]);
		createTiddlyText(place, s);
	}
};

config.macros.yourSearch.funcs.count = function(place) {
	if (lastSearchText) {
		createTiddlyText(place, lastResults.length.toString());
	}
};

config.macros.yourSearch.funcs.query = function(place) {
	if (lastResults) {
		createTiddlyText(place, lastSearchText);
	}
};

config.macros.yourSearch.funcs.version = function(place) {
	var t = "YourSearch %0.%1.%2".format(
			[version.extensions.YourSearchPlugin.major, 
			 version.extensions.YourSearchPlugin.minor, 
			 version.extensions.YourSearchPlugin.revision]);
	var e = createTiddlyElement(place, "a");
	e.setAttribute("href", "http://tiddlywiki.abego-software.de/#YourSearchPlugin");
	e.innerHTML = '<font color="black" face="Arial, Helvetica, sans-serif">'+t+'<font>';
};

config.macros.yourSearch.funcs.copyright = function(place) {
	var e = createTiddlyElement(place, "a");
	e.setAttribute("href", "http://tiddlywiki.abego-software.de");
	e.innerHTML = '<font color="black" face="Arial, Helvetica, sans-serif">&copy; 2005-2006 <b><font color="red">abego</font></b> Software<font>';
};


config.macros.yourSearch.funcs.linkButton = function(place,macroName,params,wikifier,paramString,tiddler) {
	if (params < 2) return;
	
	var	tiddlyLink = params[1];
	var text = params < 3 ? tiddlyLink : params[2];
	var tooltip = params < 4 ? text : params[3];
	var accessKey = params < 5 ? null : params[4];
	
	var btn = createTiddlyButton(place,text,tooltip,closeResultAndDisplayTiddler,null,null, accessKey);
	btn.setAttribute("tiddlyLink",tiddlyLink);
};

config.macros.yourSearch.funcs.closeButton = function(place,macroName,params,wikifier,paramString,tiddler) {
	var button = createTiddlyButton(place, "close", "Close the Search Results (Shortcut: ESC)", closeResult);
};

config.macros.yourSearch.funcs.openAllButton = function(place,macroName,params,wikifier,paramString,tiddler) {
	if (!lastResults) return;
	var n = lastResults.length;
	if (n == 0) return;

	var title = n == 1 ? "open tiddler" : "open all %0 tiddlers".format([n]);
	var button = createTiddlyButton(place, title, "Open all found tiddlers (Shortcut: Alt-O)", openAllFoundTiddlers);
	button.setAttribute("accessKey","O");
};

var onNaviButtonClick = function(e) {
	if (!e) var e = window.event;
	var pageIndex = getIntAttribute(this, "page");
	setFirstIndexOnPage(pageIndex * getItemsPerPage(), 0);
};

config.macros.yourSearch.funcs.naviBar = function(place,macroName,params,wikifier,paramString,tiddler) {
	if (!lastResults || lastResults.length == 0) return;

	var button;
	var currentPageIndex = Math.floor(firstIndexOnPage / getItemsPerPage());
	var lastPageIndex = Math.floor((lastResults.length-1) / getItemsPerPage());
	if (currentPageIndex > 0) {
		button = createTiddlyButton(place, "Previous", "Go to previous page (Shortcut: Alt-'<')", onNaviButtonClick, "prev");
		button.setAttribute("page",(currentPageIndex-1).toString());
		button.setAttribute("accessKey","<");
	}

	for (var i = -maxPagesInNaviBar; i < maxPagesInNaviBar; i++) {
		var pageIndex = currentPageIndex+i;
		if (pageIndex < 0) continue;
		if (pageIndex > lastPageIndex) break;

		var pageNo = (i+currentPageIndex+1).toString();
		var buttonClass = pageIndex == currentPageIndex ? "currentPage" : "otherPage";
		button = createTiddlyButton(place, pageNo, "Go to page %0".format([pageNo]), onNaviButtonClick, buttonClass);
		button.setAttribute("page",(pageIndex).toString());
	}
	
	if (currentPageIndex < lastPageIndex) {
		button = createTiddlyButton(place, "Next", "Go to next page (Shortcut: Alt-'>')", onNaviButtonClick, "next");
		button.setAttribute("page",(currentPageIndex+1).toString());
		button.setAttribute("accessKey",">");
	}
};


config.macros.yourSearch.funcs["if"] = function(place,macroName,params,wikifier,paramString,tiddler) {
	if (params.length < 2) return;
	
	var testName = params[1];
	var negate = (testName == "not");
	if (negate) {
		if (params.length < 3) return;
		testName = params[2];
	}
	
	var test = config.macros.yourSearch.tests[testName];
	var showIt = false;
	try {
		if (test) {
			showIt = test(place,macroName,params,wikifier,paramString,tiddler) != negate;
		} else {
			// When no predefined test is specified try to evaluate it as a JavaScript expression.
			showIt = (!eval(testName)) == negate;
		}
	} catch (ex) {
	}
	
	if (!showIt) {
		place.style.display="none";
	}
};

var createOptionWithRefresh = function(place, optionParams, wikifier,tiddler) {
	invokeMacro(place,"option",optionParams,wikifier,tiddler);
	// The option macro appended the component at the end of the place.
	var elem = place.lastChild;
	var oldOnClick = elem.onclick;
	elem.onclick = function(e) {
		var result = oldOnClick.apply(this, arguments);
		refreshResult();
		return result;
	};
	return elem;
};

config.macros.yourSearch.funcs.chkPreviewText = function(place,macroName,params,wikifier,paramString,tiddler) {
	var optionParams = params.slice(1).join(" ");
	
	var elem = createOptionWithRefresh(place, "chkPreviewText", wikifier,tiddler);
	elem.setAttribute("accessKey", "P");
	elem.title = "Show text preview of found tiddlers (Shortcut: Alt-P)";	
	return elem;
};

// ====Macro foundTiddler ================================================

config.macros.foundTiddler = {
	// Standard Properties
	label: "foundTiddler",
	prompt: "Provides information on the tiddler currently processed on the YourSearch result page",
	
	funcs: {}
};


config.macros.foundTiddler.handler = function(place,macroName,params,wikifier,paramString,tiddler) {
	if (!currentTiddler) return;
	var name = params[0];
	var func = config.macros.foundTiddler.funcs[name];
	if (func) func(place,macroName,params,wikifier,paramString,tiddler);
};

// Closes the Search Result window and displays the tiddler 
// defined by the "tiddlyLink" attribute of this element
//
var closeResultAndDisplayTiddler = function(e)
{
	closeResult();
	
	var title = this.getAttribute("tiddlyLink");
	if(title) {
		var withHilite = this.getAttribute("withHilite");
		var oldHighlightHack = highlightHack;
		if (withHilite && withHilite=="true" && lastQuery) {
			highlightHack = lastQuery.getMarkRegExp();
		}
		story.displayTiddler(this,title);
		highlightHack = oldHighlightHack;
	}
	return(false);
};

// Returns the "shortcut number" of the currentTiddler. 
// I.e. When the user presses Alt-n the given tiddler is opened/display.
//
// @return 0-9 or -1 when no number is defined
//
var getShortCutNumber = function() {
	if (!currentTiddler) return -1;
	
	if (indexInPage >= 0 && indexInPage <= 9) {
		return indexInPage < 9 ? (indexInPage+1) : 0;
	} else {
		return -1;
	}
};

config.macros.foundTiddler.funcs.title = function(place,macroName,params,wikifier,paramString,tiddler) {
	if (!currentTiddler) return;
	
	var shortcutNumber = getShortCutNumber();
	var tooltip = shortcutNumber >= 0 
			? "Open tiddler (Shortcut: Alt-%0)".format([shortcutNumber.toString()])
			: "Open tiddler";

	var btn = createTiddlyButton(place,null,tooltip,closeResultAndDisplayTiddler,null);
	btn.setAttribute("tiddlyLink",currentTiddler.title);
	btn.setAttribute("withHilite","true");
	
	createLimitedTextWithMarks(btn, currentTiddler.title, maxCharsInTitle);

	if (shortcutNumber >= 0) {
		btn.setAttribute("accessKey",shortcutNumber.toString());
	}
};

config.macros.foundTiddler.funcs.tags = function(place,macroName,params,wikifier,paramString,tiddler) {
	if (!currentTiddler) return;

	createLimitedTextWithMarks(place, currentTiddler.getTags(), maxCharsInTags);
};

config.macros.foundTiddler.funcs.text = function(place,macroName,params,wikifier,paramString,tiddler) {
	if (!currentTiddler) return;

	createLimitedTextWithMarks(place, removeTextDecoration(currentTiddler.text), maxCharsInText);
};


// Renders the "shortcut number" of the current tiddler, to indicate to the user
// what number to "Alt-press" to open the tiddler.
//
config.macros.foundTiddler.funcs.number = function(place,macroName,params,wikifier,paramString,tiddler) {
	var numberToDisplay = getShortCutNumber();
	if (numberToDisplay >= 0) {
		var text = "%0)".format([numberToDisplay.toString()]);
		createTiddlyElement(place,"span",null,"shortcutNumber",text);
	}
};

function scrollToAnchor(name) {
	return false;
}
//----------------------------------------------------------------------------
// Configuration Stuff
//----------------------------------------------------------------------------

if (config.options.chkUseYourSearch == undefined) config.options.chkUseYourSearch = true;
if (config.options.chkPreviewText == undefined) config.options.chkPreviewText = true;
if (config.options.chkSearchAsYouType == undefined) config.options.chkSearchAsYouType=true;
if (config.options.chkSearchInTitle == undefined) config.options.chkSearchInTitle=true;
if (config.options.chkSearchInText == undefined) config.options.chkSearchInText=true;
if (config.options.chkSearchInTags == undefined) config.options.chkSearchInTags=true;
if (config.options.txtItemsPerPage == undefined) config.options.txtItemsPerPage =itemsPerPageDefault;
if (config.options.txtItemsPerPageWithPreview == undefined) config.options.txtItemsPerPageWithPreview=itemsPerPageWithPreviewDefault;

config.shadowTiddlers.AdvancedOptions += "\n<<option chkUseYourSearch>> Use 'Your Search' //([[more options|YourSearch Options]])//";

//----------------------------------------------------------------------------
// Shadow Tiddlers
//----------------------------------------------------------------------------

config.shadowTiddlers["YourSearch Introduction"] = 
			"!About YourSearch\n"+
			"\n"+
			"YourSearch gives you a bunch of new features to simplify and speed up your daily searches in TiddlyWiki. It seamlessly integrates into the standard TiddlyWiki search: just start typing into the 'search' field and explore!\n"+
			"\n"+
			"''May the '~Alt-F' be with you.''\n"+
			"\n"+
			"\n"+
			"!Features\n"+
			"* YourSearch searches for tiddlers that match your query ''as you type'' into the 'search' field. It presents a list of the ''\"Top Ten\"'' tiddlers in a ''popup-like window'': the ''[[YourSearch Result]]''. The tiddlers currently displayed in your TiddlyWiki are not affected.\n"+
			"* Using ''~TiddlerRank technology'' the [[YourSearch Result]] lists the ''most interesting tiddlers first''.\n"+
			"* Through ''Filtered Search'' and ''Boolean Search'' you can easily refining your search, like excluding words or searching for multiple words. This way less tiddlers are displayed in the [[YourSearch Result]] and you can faster scan the result for the tiddler you are looking for.\n"+
			"* The [[YourSearch Result]] lists the found tiddlers ''page-wise'', e.g. 10 per page. Use the ''Result Page Navigation Bar'' to navigate between pages if the result does not fit on one page.\n"+
			"* The [[YourSearch Result]] states the ''total number of found tiddlers''. This way you can quickly decide if you want to browse the result list or if you want to refine your search first to shorten the result list.\n"+
			"* Beside the ''title of the found tiddlers'' the [[YourSearch Result]] also ''displays tags'' and ''tiddler text previews''. The ''tiddler text preview'' is an extract of the tiddler's content, showing the most interesting parts related to your query (e.g. the texts around the words you are looking for).\n"+
			"* The words you are looking for are hilited in the titles, tags and text previews of the [[YourSearch Result]].\n"+
			"* If you are not interested in the tiddler text previews but prefer to get longer lists of tiddlers on one result page you may ''switch of the text preview''.\n"+
			"* If the [[YourSearch Result]] contains the tiddler you are looking for you can just ''click its title to display'' it in your TiddlyWiki. Alternatively you may also ''open all found tiddlers'' at once. \n"+
			"* Use [[YourSearch Options]] to customize YourSearch to your needs. E.g. depending on the size of your screen you may change the number of tiddlers displayed in the [[YourSearch Result]]. In the [[YourSearch Options]] and the AdvancedOptions you may also switch off YourSearch in case you temporarily want to use the standard search.\n"+
			"* For the most frequently actions ''access keys'' are defined so you can perform your search without using the mouse.\n"+
			"\n"
			;

config.shadowTiddlers["YourSearch Help"] = 
//			"<html><a name='Top'/>"+
//			"<a href='javascript:scrollToAnchor(\"Filtered\");'>[Filtered Search] </a>"+
//			"<a href='#Boolean'>[Boolean Search] </a>"+
//			"<a href='#Exact'>['Exact Word' Search] </a>"+
//			"<a href='#Combined'>[Combined Search] </a>"+
//			"<a href='#Case'>[CaseSensitiveSearch and RegExpSearch] </a>"+
//			"<a href='#Access'>[Access Keys] </a>"+
//			"</html>"+
			"<<tiddler [[YourSearch Introduction]]>>"+
//			"<html><sub><a href='#Top'>[Top]</a></sub></html>\n"+
			"\n"+
			"!Filtered Search<html><a name='Filtered'/></html>\n"+
			"Using the Filtered Search you can restrict your search to certain parts of a tiddler, e.g only search the tags or only the titles.\n"+
			"|!What you want|!What you type|!Example|\n"+
			"|Search ''titles only''|start word with ''!''|{{{!jonny}}}|\n"+
			"|Search ''contents only''|start word with ''%''|{{{%football}}}|\n"+
			"|Search ''tags only''|start word with ''#''|{{{#Plugin}}}|\n"+
			"\n"+
			"You may use more than one filter for a word. E.g. {{{!#Plugin}}} finds tiddlers containing \"Plugin\" either in the title or in the tags (but does not look for \"Plugin\" in the content).\n"+
//			"<html><sub><a href='#Top'>[Top]</a></sub></html>\n"+
			"\n"+
			"!Boolean Search<html><a name='Boolean'/></html>\n"+
			"The Boolean Search is useful when searching for multiple words.\n"+
			"|!What you want|!What you type|!Example|\n"+
			"|''All words'' must exist|List of words|{{{jonny jeremy}}}|\n"+
			"|''At least one word'' must exist|Separate words by ''or''|{{{jonny or jeremy}}}|\n"+
			"|A word ''must not exist''|Start word with ''-''|{{{-jonny}}}|\n"+
			"\n"+
			"''Note:'' When you specify two words, separated with a space, YourSearch finds all tiddlers that contain both words, but not necessarily next to each other. If you want to find a sequence of word, e.g. '{{{John Brown}}}', you need to put the words into quotes. I.e. you type: {{{\"john brown\"}}}.\n"+
//			"<html><sub><a href='#Top'>[Top]</a></sub></html>\n"+
			"\n"+
			"!'Exact Word' Search<html><a name='Exact'/></html>\n"+
			"By default a search result all matches that 'contain' the searched text. \n"+
			" E.g. if you search for 'Task' you will get all tiddlers containing 'Task', but also 'CompletedTask', 'TaskForce' etc.\n"+
			"\n"+
			"If you only want to get the tiddlers that contain 'exactly the word' you need to prefix it with a '='. E.g. typing '=Task' will the tiddlers that contain the word 'Task', ignoring words that just contain 'Task' as a substring.\n"+
//			"<html><sub><a href='#Top'>[Top]</a></sub></html>\n"+
			"\n"+
			"!Combined Search<html><a name='Combined'/></html>\n"+
			"You are free to combine the various search options. \n"+
			"\n"+
			"''Examples''\n"+
			"|!What you type|!Result|\n"+
			"|{{{!jonny !jeremy -%football}}}| all tiddlers with both {{{jonny}}} and {{{jeremy}}} in its titles, but no {{{football}}} in content.|\n"+
			"|{{{#=Task}}}|All tiddlers tagged with 'Task' (the exact word). Tags named 'CompletedTask', 'TaskForce' etc. are not considered.|\n"+
//			"<html><sub><a href='#Top'>[Top]</a></sub></html>\n"+
			"\n"+
			"!~CaseSensitiveSearch and ~RegExpSearch<html><a name='Case'/></html>\n"+
			"The standard search options ~CaseSensitiveSearch and ~RegExpSearch are fully supported by YourSearch. However when ''~RegExpSearch'' is on Filtered and Boolean Search are disabled.\n"+
//			"<html><sub><a href='#Top'>[Top]</a></sub></html>\n"+
			"\n"+
			"!Access Keys<html><a name='Access'/></html>\n"+
			"You are encouraged to use the access keys (also called \"shortcut\" keys) for the most frequently used operations. For quick reference these shortcuts are also mentioned in the tooltip for the various buttons etc.\n"+
			"\n"+
			"|!Key|!Operation|\n"+
			"|{{{Alt-F}}}|''The most important keystroke'': It moves the cursor to the search input field so you can directly start typing your query. Pressing {{{Alt-F}}} will also display the previous search result. This way you can quickly display multiple tiddlers using \"Press {{{Alt-F}}}. Select tiddler.\" sequences.|\n"+
			"|{{{ESC}}}|Closes the [[YourSearch Result]]. When the [[YourSearch Result]] is already closed and the cursor is in the search input field the field's content is cleared so you start a new query.|\n"+
			"|{{{Alt-1}}}, {{{Alt-2}}},... |Pressing these keys opens the first, second etc. tiddler from the result list.|\n"+
			"|{{{Alt-O}}}|Opens all found tiddlers.|\n"+
			"|{{{Alt-P}}}|Toggles the 'Preview Text' mode.|\n"+
			"|{{{Alt-'<'}}}, {{{Alt-'>'}}}|Displays the previous or next page in the [[YourSearch Result]].|\n"+
			"|{{{Return}}}|When you have turned off the 'as you type' search mode pressing the {{{Return}}} key actually starts the search (as does pressing the 'search' button).|\n"+
//			"<html><sub><a href='#Top'>[Top]</a></sub></html>\n"+
			"\n"
			;

config.shadowTiddlers["YourSearch Options"] = 
			"|>|!YourSearch Options|\n"+
			"|>|<<option chkUseYourSearch>> Use 'Your Search'|\n"+
			"|!|<<option chkPreviewText>> Show Text Preview|\n"+
			"|!|<<option chkSearchAsYouType>> 'Search As You Type' Mode (No RETURN required to start search)|\n"+
			"|!|Default Search Filter:<<option chkSearchInTitle>>Titles ('!')     <<option chkSearchInText>>Texts ('%')     <<option chkSearchInTags>>Tags ('#')    <html><br><font size=\"-2\">The parts of a tiddlers that are searched when you don't explicitly specify a filter in the search text (using a '!', '%' or '#' prefix).</font></html>|\n"+
			"|!|Number of items on search result page: <<option txtItemsPerPage>>|\n"+
			"|!|Number of items on search result page with preview text: <<option txtItemsPerPageWithPreview>>|\n"
			;
			
config.shadowTiddlers["YourSearchStyleSheet"] = 
			"/***\n"+
			"!~YourSearchResult Stylesheet\n"+
			"***/\n"+
			"/*{{{*/\n"+
			".yourSearchResult {\n"+
			"\tposition: absolute;\n"+
			"\twidth: 800px;\n"+
			"\n"+
			"\tpadding: 0.2em;\n"+
			"\tlist-style: none;\n"+
			"\tmargin: 0;\n"+
			"\n"+
			"\tbackground: White;\n"+
			"\tborder: 1px solid DarkGray;\n"+
			"}\n"+
			"\n"+
			"/*}}}*/\n"+
			"/***\n"+
			"!!Summary Section\n"+
			"***/\n"+
			"/*{{{*/\n"+
			".yourSearchResult .summary {\n"+
			"\tborder-bottom-width: thin;\n"+
			"\tborder-bottom-style: solid;\n"+
			"\tborder-bottom-color: #999999;\n"+
			"\tpadding-bottom: 4px;\n"+
			"}\n"+
			"\n"+
			".yourSearchRange, .yourSearchCount, .yourSearchQuery   {\n"+
			"\tfont-weight: bold;\n"+
			"}\n"+
			"\n"+
			".yourSearchResult .summary .button {\n"+
			"\tfont-size: 10px;\n"+
			"\n"+
			"\tpadding-left: 0.3em;\n"+
			"\tpadding-right: 0.3em;\n"+
			"}\n"+
			"\n"+
			".yourSearchResult .summary .chkBoxLabel {\n"+
			"\tfont-size: 10px;\n"+
			"\n"+
			"\tpadding-right: 0.3em;\n"+
			"}\n"+
			"\n"+
			"/*}}}*/\n"+
			"/***\n"+
			"!!Items Area\n"+
			"***/\n"+
			"/*{{{*/\n"+
			".yourSearchResult .marked {\n"+
			"\tbackground: none;\n"+
			"\tfont-weight: bold;\n"+
			"}\n"+
			"\n"+
			".yourSearchItem {\n"+
			"\tmargin-top: 2px;\n"+
			"}\n"+
			"\n"+
			".yourSearchNumber {\n"+
			"\tcolor: #808080;\n"+
			"}\n"+
			"\n"+
			"\n"+
			".yourSearchTags {\n"+
			"\tcolor: #008000;\n"+
			"}\n"+
			"\n"+
			".yourSearchText {\n"+
			"\tcolor: #808080;\n"+
			"\tmargin-bottom: 6px;\n"+
			"}\n"+
			"\n"+
			"/*}}}*/\n"+
			"/***\n"+
			"!!Footer\n"+
			"***/\n"+
			"/*{{{*/\n"+
			".yourSearchFooter {\n"+
			"\tmargin-top: 8px;\n"+
			"\tborder-top-width: thin;\n"+
			"\tborder-top-style: solid;\n"+
			"\tborder-top-color: #999999;\n"+
			"}\n"+
			"\n"+
			".yourSearchFooter a:hover{\n"+
			"\tbackground: none;\n"+
			"\tcolor: none;\n"+
			"}\n"+
			"/*}}}*/\n"+
			"/***\n"+
			"!!Navigation Bar\n"+
			"***/\n"+
			"/*{{{*/\n"+
			".yourSearchNaviBar a {\n"+
			"\tfont-size: 16px;\n"+
			"\tmargin-left: 4px;\n"+
			"\tmargin-right: 4px;\n"+
			"\tcolor: black;\n"+
			"\ttext-decoration: underline;\n"+
			"}\n"+
			"\n"+
			".yourSearchNaviBar a:hover {\n"+
			"\tbackground-color: none;\n"+
			"}\n"+
			"\n"+
			".yourSearchNaviBar .prev {\n"+
			"\tfont-weight: bold;\n"+
			"\tcolor: blue;\n"+
			"}\n"+
			"\n"+
			".yourSearchNaviBar .currentPage {\n"+
			"\tcolor: #FF0000;\n"+
			"\tfont-weight: bold;\n"+
			"\ttext-decoration: none;\n"+
			"}\n"+
			"\n"+
			".yourSearchNaviBar .next {\n"+
			"\tfont-weight: bold;\n"+
			"\tcolor: blue;\n"+
			"}\n"+
			"/*}}}*/\n"
			;

config.shadowTiddlers["YourSearchResultTemplate"] = 
			"<!--\n"+
			"{{{\n"+
			"-->\n"+
			"<span macro=\"yourSearch if found\">\n"+
			"<!-- The Summary Header ============================================ -->\n"+
			"<table class=\"summary\" border=\"0\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\"><tbody>\n"+
			"  <tr>\n"+
			"\t<td align=\"left\">\n"+
			"\t\tYourSearch Result <span class=\"yourSearchRange\" macro=\"yourSearch itemRange\"></span>\n"+
			"\t\t&nbsp;of&nbsp;<span class=\"yourSearchCount\" macro=\"yourSearch count\"></span>\n"+
			"\t\tfor&nbsp;<span class=\"yourSearchQuery\" macro=\"yourSearch query\"></span>\n"+
			"\t</td>\n"+
			"\t<td class=\"yourSearchButtons\" align=\"right\">\n"+
			"\t\t<span macro=\"yourSearch chkPreviewText\"></span><span class=\"chkBoxLabel\">preview text</span>\n"+
			"\t\t<span macro=\"yourSearch openAllButton\"></span>\n"+
			"\t\t<span macro=\"yourSearch linkButton 'YourSearch Options' options 'Configure YourSearch'\"></span>\n"+
			"\t\t<span macro=\"yourSearch linkButton 'YourSearch Help' help 'Get help how to use YourSearch'\"></span>\n"+
			"\t\t<span macro=\"yourSearch closeButton\"></span>\n"+
			"\t</td>\n"+
			"  </tr>\n"+
			"</tbody></table>\n"+
			"\n"+
			"<!-- The List of Found Tiddlers ============================================ -->\n"+
			"<div id=\"yourSearchResultItems\" itemsPerPage=\"25\" itemsPerPageWithPreview=\"10\"></div>\n"+
			"\n"+
			"<!-- The Footer (with the Navigation) ============================================ -->\n"+
			"<table class=\"yourSearchFooter\" border=\"0\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\"><tbody>\n"+
			"  <tr>\n"+
			"\t<td align=\"left\">\n"+
			"\t\tResult page: <span class=\"yourSearchNaviBar\" macro=\"yourSearch naviBar\"></span>\n"+
			"\t</td>\n"+
			"\t<td align=\"right\"><span macro=\"yourSearch version\"></span>, <span macro=\"yourSearch copyright\"></span>\n"+
			"\t</td>\n"+
			"  </tr>\n"+
			"</tbody></table>\n"+
			"<!-- end of the 'tiddlers found' case =========================================== -->\n"+
			"</span>\n"+
			"\n"+
			"\n"+
			"<!-- The \"No tiddlers found\" case =========================================== -->\n"+
			"<span macro=\"yourSearch if not found\">\n"+
			"<table class=\"summary\" border=\"0\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\"><tbody>\n"+
			"  <tr>\n"+
			"\t<td align=\"left\">\n"+
			"\t\tYourSearch Result: No tiddlers found for <span class=\"yourSearchQuery\" macro=\"yourSearch query\"></span>.\n"+
			"\t</td>\n"+
			"\t<td class=\"yourSearchButtons\" align=\"right\">\n"+
			"\t\t<span macro=\"yourSearch linkButton 'YourSearch Options' options 'Configure YourSearch'\"></span>\n"+
			"\t\t<span macro=\"yourSearch linkButton 'YourSearch Help' help 'Get help how to use YourSearch'\"></span>\n"+
			"\t\t<span macro=\"yourSearch closeButton\"></span>\n"+
			"\t</td>\n"+
			"  </tr>\n"+
			"</tbody></table>\n"+
			"</span>\n"+
			"\n"+
			"\n"+
			"<!--\n"+
			"}}}\n"+
			"-->\n"
			;

config.shadowTiddlers["YourSearchItemTemplate"] = 
			"<!--\n"+
			"{{{\n"+
			"-->\n"+
			"<span class='yourSearchNumber' macro='foundTiddler number'></span>\n"+
			"<span class='yourSearchTitle' macro='foundTiddler title'/></span>&nbsp;-&nbsp;\n"+
			"<span class='yourSearchTags' macro='foundTiddler tags'/></span>\n"+
			"<span macro=\"yourSearch if previewText\"><div class='yourSearchText' macro='foundTiddler text'/></div></span>\n"+
			"<!--\n"+
			"}}}\n"+
			"-->"
			;
config.shadowTiddlers["YourSearch"] = "<<tiddler [[YourSearch Help]]>>";

config.shadowTiddlers["YourSearch Result"] = "The popup-like window displaying the result of a YourSearch query.";


setStylesheet(
    store.getTiddlerText("YourSearchStyleSheet"),
    "yourSearch");

//----------------------------------------------------------------------------
// Install YourSearch
//----------------------------------------------------------------------------

// Overwrite the TiddlyWiki search handler and verify after a while 
// that nobody else has overwritten it.

var origMacros_search_handler = config.macros.search.handler;
config.macros.search.handler = myMacroSearchHandler;


var ownsOverwrittenFunctions = function() {
    var result = (config.macros.search.handler == myMacroSearchHandler);
   	return result;
};

var checkForOtherHijacker = function() {
    if (!ownsOverwrittenFunctions()) {
    	alert("Message from YourSearchPlugin:\n\n\n"+
    	"Another plugin has disabled the 'Your Search' features.\n\n\n"+
    	"You may disable the other plugin or change the load order of \n"+
    	"the plugins (by changing the names of the tiddlers)\n"+ 
    	"to enable the 'Your Search' features.");
    }
};

setTimeout(checkForOtherHijacker, 5000);


// === Public API =================================

abego.YourSearch.getStandardRankFunction = function() {
	return standardRankFunction;
};

abego.YourSearch.getRankFunction = function() {
	return abego.YourSearch.getStandardRankFunction();
};

abego.YourSearch.getCurrentTiddler = function() {
	return currentTiddler;
};

} // of "install only once"
//}}}
// Used Globals (for JSLint) ==============

// ... JavaScript Core
/*global 	alert,clearTimeout,confirm */
// ... TiddlyWiki Core
/*global 	Tiddler, applyHtmlMacros, clearMessage, createTiddlyElement, createTiddlyButton, createTiddlyText, ensureVisible ,findPosX, highlightHack, findPosY,findWindowWidth, invokeMacro, saveChanges, refreshElements, story */

/***
%/
!Licence and Copyright
Copyright (c) abego Software ~GmbH, 2005-2006 ([[www.abego-software.de|http://www.abego-software.de]])

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this
list of conditions and the following disclaimer in the documentation and/or other
materials provided with the distribution.

Neither the name of abego Software nor the names of its contributors may be
used to endorse or promote products derived from this software without specific
prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
DAMAGE.
***/

