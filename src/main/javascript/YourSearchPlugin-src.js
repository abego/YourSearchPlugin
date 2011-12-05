/***
|''Name:''|YourSearchPlugin|
|''Version:''|1.0.1 (2006-01-06)|
|''Source:''|http://tiddlywiki.abego-software.de/#YourSearchPlugin|
|''Author:''|UdoBorkowski (ub [at] abego-software [dot] de)|
|''Licence:''|[[BSD open source license]]|
|''TiddlyWiki:''|1.2.38+, 2.0|
|''Browser:''|Firefox 1.0.4+; InternetExplorer 6.0|
!Description
Looking for all tiddlers dealing with 'jonny' and 'jeremy' but not tagged 'football'? Want to find every tiddler that contains "recipe" in its title and deals with "potato"? With the "YourSearchPlugin" you can use the standard "search" box to easily accomplish searches like this. 

E.g. type "jonny jeremy -#football" into the search box to find all tiddlers dealing with 'jonny' and 'jeremy' but not tagged 'football'. Or enter "!recipe potato" to get all tiddlers with "recipe" in their title and "potato" in their text, tags or title.

You can restrict the search to the title, the text or the tags of tiddlers, look for multiple words or alternatives, exclude tiddlers that contain certain texts and many more.


''Quick Reference''
|!Filtered Search|!What you type|!Example||!'Boolean' Search|!What you type|!Example|
|Search ''titles only''|start word with ''!''|{{{!jonny}}}||''All words'' must exist|List of words|{{{jonny jeremy}}}|
|Search ''contents only''|start word with ''%''|{{{%football}}}||''At least one word'' must exist|Separate words by ''or''|{{{jonny or jeremy}}}|
|Search ''tags only''|start word with ''#''|{{{#Plugin}}}||A word ''must not exist''|Start word with ''-''|{{{-jonny}}}|
''Text with spaces:'' If you want to search for text containing a space surround it with "...". E.g. {{{"meet jonny"}}}
''Multi filtered search:'' E.g. {{{!%jonny}}} searches for {{{jonny}}} both in titles and contents (but not in tags).
''Combine filtered and boolean search:'' E.g. {{{!jonny !jeremy -%football}}} finds tiddlers with both {{{jonny}}} and {{{jeremy}}} in its titles, but no football in content.
''~RexExpSearch:'' Filtered and 'Boolean' Search are disabled when ~RexExpSearch is on.

!How it works

The "build-in" search looks for tiddlers that contain the complete text you typed in the search box. ~YourSearch is different. It separates the search text into individual "terms"(/words), typically separated by spaces and combines the individual terms in a second step. 

E.g. when you type '{{{hello world}}}' in the search box the build-in search returns every tiddler that contains exactly that text (a "{{{hello}}}" followed by a space, followed by "{{{world}}}".) YourSearch will return all tiddlers that contain "{{{hello}}}" and "{{{world}}}", independent of their order or location in the tiddler. They may even be distributed in the title and text.

By default ''all'' specified terms must exist in a tiddler to put it into the result. But one may also specify "alternatives" using the keyword "or", i.e. at least one of the given words must exist. E.g. "{{{jonny or jeremy}}}" returns all tiddlers that either deal with "{{{jonny}}}" ''or'' "{{{jeremy}}}".

To exclude tiddlers that contain a certain word just start the word with a "minus" character. E.g. "{{{-evil}}}" will only select tiddlers that don't contain "{{{evil}}}".

In addition one may filter the search to only check for the title, text or tags (or combinations of this). This is accomplished by prefixing the words with the special characters ''!'' (for title), ''%'' (for text) or ''#'' (for tags).

All these features can be combined and concatenated. E.g. you may write something like this "{{{#bugreport or #changerequest -#closed !save}}}": Get all tiddlers tagged as "{{{bugreport}}}" or "{{{changerequest}}}" that are not tagged as "{{{closed}}}" and contain "{{{save}}}" in their title. 


!Options

''Use 'Your Search' '': In the AdvancedOptions you may switch between build-in and "YourSearch". Here you will also find a little "quick reference" explaining how to formulate your search request.

''Case Sensitive'': YourSearch respects the "Case Sensitive" search option. I.e. when this option is on the text in the tiddlers must match the searched text exactly, even in the case. When the option is off the case is ignored when searching in the tiddlers.

''RegExpSearch'': When the "RegExpSearch" option is on the build-in search is used and YourSearch is temporary disabled.


!Integration with SearchOptionsPlugin

The YourSearch plugin works nicely together with Eric Shulman's "SearchOptionsPlugin" (http://www.elsdesign.com/tiddlywiki/#SearchOptionsPlugin). Especially combining the "Search results show list of matching tiddlers" feature with  the YourSearch plugin gives you extra benefits since you may now modify your search criteria until the "list of matching tiddlers" is short enough to locate the tiddlers your are looking for. 

In addition the SearchOptions features "Search results show title matches first" and "Incremental searching" are also supported. The settings of "Search in tiddler titles/text/tags" are ignored since you can easily perform these restricted searches with the "!", "%" and "#" prefixes.

!Revision history
* v1.0.1 (2006-01-06)
** Support TiddlyWiki 2.0
* v1.0.0 (2005-12-28)
** initial version
!Code
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
	major: 1, minor: 0, revision: 1,
	date: new Date(2006, 1, 6), 
	type: 'plugin',
	source: "http://tiddlywiki.abego-software.de/#YourSearchPlugin"
};


if (config.options.chkUseYourSearch == undefined) config.options.chkUseYourSearch = true;
config.shadowTiddlers.AdvancedOptions += "\n<<option chkUseYourSearch>> Use 'Your Search'\n"+"~~''Quick Reference''\n|!Filtered Search|!What you type|!Example||!'Boolean' Search|!What you type|!Example|\n|Search ''titles only''|start word with ''!''|{{{!jonny}}}||''All words'' must exist|List of words|{{{jonny jeremy}}}|\n|Search ''contents only''|start word with ''%''|{{{%football}}}||''At least one word'' must exist|Separate words by ''or''|{{{jonny or jeremy}}}|\n|Search ''tags only''|start word with ''#''|{{{#Plugin}}}||A word ''must not exist''|Start word with ''-''|{{{-jonny}}}|\n''Text with spaces:'' If you want to search for text containing a space surround it with \"...\". E.g. {{{\"meet jonny\"}}}\n''Multi filtered search:'' E.g. {{{!%jonny}}} searches for {{{jonny}}} both in titles and contents (but not in tags).\n''Combine filtered and boolean search:'' E.g. {{{!jonny !jeremy -%football}}} finds tiddlers with both {{{jonny}}} and {{{jeremy}}} in its titles, but no football in content.\n''~RexExpSearch:'' Filtered and 'Boolean' Search are disabled when ~RexExpSearch is on.~~";



YourSearch = {};

YourSearch.defaultRankFunction = function(tiddler, query) {
    tiddler.searchRank = 1;
}

YourSearch.tagAndTitleFirstRankFunction = function(tiddler, query) {
	tiddler.searchRank = 
		(query.getOnlyMatchTagAndTitleQuery().matchesTiddler(tiddler))
			? 2
			: 1;
}

YourSearch.getRankFunction = function() {
	return config.options.chkSearchTitlesFirst 
			? YourSearch.tagAndTitleFirstRankFunction 
			: YourSearch.defaultRankFunction;
}


// Internal.
//
YourSearch.findMatches = function(store, searchText,caseSensitive,useRegExp,sortField,excludeTag) {
	var candidates = store.reverseLookup("tags",excludeTag,false);
	var query = new SimpleTiddlerQuery(searchText,caseSensitive); 
	var results = query.getMatchingTiddlers(candidates);

	// Rank the results
	for (var i = 0; i < results.length; i++) {
		YourSearch.getRankFunction()(results[i], query);
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
	}
	results.sort(sortFunction);
	
	// Remove rank information
	for (var i = 0; i < results.length; i++) {
        delete results[i].searchRank;
	}
	
	return results;
}

// Internal.
//
YourSearch.MyTiddlyWikiSearchFunction = function(searchText,caseSensitive,useRegExp,sortField,excludeTag) {
	// When "RegExpSearch" is on or the "UseYourSearch" is off we use the classic search.
	if (useRegExp || !config.options.chkUseYourSearch) {
		return YourSearch.oldTiddlyWikiSearchFunction.apply(this, arguments);
	}
	
	return YourSearch.findMatches(this, searchText,caseSensitive,useRegExp,sortField,excludeTag);
}

// Internal.
//
YourSearch.MyStoreSearchFunction = function(searchText,caseSensitive,useRegExp,sortField,excludeTag) {
	// When "RegExpSearch" is on or the "UseYourSearch" is off we use the classic search.
	if (useRegExp || !config.options.chkUseYourSearch) {
		return YourSearch.oldStoreSearchFunction.apply(this, arguments);
	}
	
	return YourSearch.findMatches(this, searchText,caseSensitive,useRegExp,sortField,excludeTag);
}

// Internal.
//
YourSearch.ownsSearchFunction = function() {
    return (TiddlyWiki.prototype.search == YourSearch.MyTiddlyWikiSearchFunction) && (store.search == YourSearch.MyStoreSearchFunction);
}

// Internal.
//
YourSearch.checkForOtherHijacker = function() {
    if (!YourSearch.ownsSearchFunction()) {
    	alert("Message from YourSearchPlugin:\n\n\n"+
    	"Another plugin has disabled the 'Your Search' features.\n\n\n"+
    	"You may disable the other plugin or change the load order of \n"+
    	"the plugins (by changing the names of the tiddlers)\n"+ 
    	"to enable the 'Your Search' features.");
    }
}

// Hijack the store search function and verify after a while if 
// nobody else has hijacked it.
//
YourSearch.oldTiddlyWikiSearchFunction = TiddlyWiki.prototype.search;
YourSearch.oldStoreSearchFunction = store.search;
TiddlyWiki.prototype.search = YourSearch.MyTiddlyWikiSearchFunction;
store.search = YourSearch.MyStoreSearchFunction;
setTimeout("YourSearch.checkForOtherHijacker()", 5000);


//----------------------------------------------------------------------------
// The SimpleTiddlerQuery Class
//----------------------------------------------------------------------------

// Internal.
// 
function SimpleTiddlerQuery(queryText, caseSensitive, matchTitleOnly) {
	this.queryText = queryText;
	this.caseSensitive = caseSensitive;
	
	this.terms = [];

	var re = new RegExp(SimpleTiddlerQuery.RE);
	var matches = re.exec(queryText);

	while (matches != null && matches.length == 6) {
		var negate = '-' == matches[1];
		var inTitle = matches[2].length == 0 || matches[2].indexOf('!') >= 0;
		var inText = !matchTitleOnly && (matches[2].length == 0 || matches[2].indexOf('%') >= 0);
		var inTag = !matchTitleOnly && (matches[2].length == 0 || matches[2].indexOf('#') >= 0);
		
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
			throw "Invalid search expression: "+queryText;
		}
		var orFollows = matches[5] && matches[5].charAt(0).toLowerCase() == 'o';
		this.terms.push(new SimpleTiddlerQuery.Term(text, inTitle, inText, inTag, negate, orFollows, caseSensitive));
		
		matches = re.exec(queryText);
	}
}



// Internal.
// 
// The regular expression that matches a single search term of the form
// (whitespace handling and grouping omitted for clarity):
//
//	 -?[#!%]*(<doubleQuoteStringLiteral>|<wordWithoutSpace>) (AND|OR)?
//
// group 1: '-'  (negate, optional)
// group 2: [!%#]* (may be empty)
// group 3: String literal "..."
// group 4: word
// group 5: AND /OR (optional) 
//
// (group 3 xor group 4 is defined)
//
SimpleTiddlerQuery.RE = /\s*(\-)?([#%!]*)(?:(?:("(?:(?:\\")|[^"])*")|(\S+)))(?:\s+((?:[aA][nN][dD])|(?:[oO][rR]))(?!\S))?/mg;


// Internal.
// 
// Returns an array with those tiddlers from the tiddlersMap that 
// match the query.
//
SimpleTiddlerQuery.prototype.getMatchingTiddlers = function(tiddlersMap) {
	var result = [];
	for (var i in tiddlersMap) {
		var t = tiddlersMap[i];
		if (this.matchesTiddler(t)) {
			result.push(t);
		}
	}
	return result;
}


// Internal.
// 
// Returns true if the query has a match in the given tiddler.
//
// @param tiddler [may be null]
//
SimpleTiddlerQuery.prototype.matchesTiddler = function(tiddler) {
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
}

// Internal.
// 
SimpleTiddlerQuery.prototype.getOnlyMatchTagAndTitleQuery = function() {
	if (!this.onlyMatchTagAndTitleQuery) {
		this.onlyMatchTagAndTitleQuery = new SimpleTiddlerQuery(this.queryText, this.caseSensitive, true);
	}
	return this.onlyMatchTagAndTitleQuery;
}


// Internal.
// 
SimpleTiddlerQuery.prototype.toString = function() {
	var result = "";
	for (var i = 0; i < this.terms.length; i++) {
		result += this.terms[i].toString();
	}
	return result;
}

//----------------------------------------------------------------------------
// The SimpleTiddlerQuery.Term Class
//----------------------------------------------------------------------------

// Internal.
//
SimpleTiddlerQuery.Term = function(text, inTitle, inText, inTag, negate, orFollows, caseSensitive) {
	this.text = text;
	this.inTitle = inTitle;
	this.inText = inText;
	this.inTag = inTag;
	this.negate = negate;
	this.orFollows = orFollows;
	this.caseSensitive = caseSensitive;
	
	this.regExp = new RegExp(text.escapeRegExp(), "m"+(caseSensitive ? "" : "i"));
}

// Internal.
//
SimpleTiddlerQuery.Term.prototype.toString = function() {
	return (this.negate ? "-" : "")+(this.inTitle ? "!" : "")+(this.inText? "%" : "")+(this.inTag? "#" : "")+'"'+this.text+'"'+ (this.orFollows ? " OR " : " AND ");
}

// Internal.
//
// Returns true if the term has a match in the given tiddler.
//
// @param tiddler [may be null]
//
SimpleTiddlerQuery.Term.prototype.matchesTiddler = function(tiddler) {
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
}

} // of "install only once"

//}}}
