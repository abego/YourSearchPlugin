/***
|''Name:''|YourSearchPlugin|
|''Version:''|2.1.5 (2010-02-16)|
|''Source:''|http://tiddlywiki.abego-software.de/#YourSearchPlugin|
|''Author:''|UdoBorkowski (ub [at] abego-software [dot] de)|
|''Licence:''|[[BSD open source license (abego Software)|http://www.abego-software.de/legal/apl-v10.html]]|
|''Copyright:''|&copy; 2005-2010 [[abego Software|http://www.abego-software.de]]|
|''~CoreVersion:''|2.1.0|
|''Community:''|[[del.icio.us|http://del.icio.us/post?url=http://tiddlywiki.abego-software.de/index.html%23YourSearchPlugin]]|
|''Browser:''|Firefox 1.0.4+; Firefox 1.5; ~InternetExplorer 6.0|
!About YourSearch
YourSearch gives you a bunch of new features to simplify and speed up your daily searches in TiddlyWiki. It seamlessly integrates into the standard TiddlyWiki search: just start typing into the 'search' field and explore!

For more information see [[Help|YourSearch Help]].
!Compatibility
This plugin requires TiddlyWiki 2.1. 
Check the [[archive|http://tiddlywiki.abego-software.de/archive]] for ~YourSearchPlugins supporting older versions of TiddlyWiki.
!Revision history
* v2.1.5 (2010-02-16)
** Fixed problems with CSS and search textfield. Thanks to Guido Glatzel for reporting.
* v2.1.4 (2009-09-04)
** Fixed "this command is not supported" error under IE 8. Thanks to rouilj for reporting. (For details see: http://groups.google.com/group/TiddlyWiki/browse_thread/thread/cffee3254381e478)
* v2.1.3 (2008-04-16)
** Fixed problem with Firefox3. Thanks to Andreas Hoefler for reporting.
* v2.1.2 (2008-03-17)
** Bug: on IE (6.0) the first letter is dropped from the search string. Thanks to Kashgarinn and Nick Padfield for reporting.
* v2.1.1 (2007-03-11)
** Extend "New tiddler" feature: Ctrl-Return invokes the "new tiddler" feature (create tiddler based on search text)
** Extend "New tiddler" feature: tiddler's text and tags may also be specified (see abego.parseNewTiddlerCommandLine)
** Support searching for URLs (like http://www.example.com)
** Provided extended public API (abego.YourSearch.getFoundTiddlers/getQuery/onShowResult)
** Clear MessageBox when search field gets focus (so the box no longer hides the search field)
** Reset search result when TiddlyWiki is changed
** Fix function abego.BoolExp
* v2.1.0 (2006-10-12)
** Release version with TiddlyWiki 2.1 support
*** Support (Extended) Field search
*** Support parenthesis in Boolean Search
*** Support direct regular expression input
*** Support JavaScript Expressions for filtering
*** "new tiddler" feature (create tiddler based on search text)
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
!Source Code
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
	major: 2, minor: 1, revision: 5,
	source: "http://tiddlywiki.abego-software.de/#YourSearchPlugin",
	licence: "[[BSD open source license (abego Software)|http://www.abego-software.de/legal/apl-v10.html]]",
	copyright: "Copyright (c) abego Software GmbH, 2005-2010 (www.abego-software.de)"
};

if (!window.abego) window.abego = {};

// define the Array forEach when not yet defined (e.g. by Mozilla)
if (!Array.forEach) {
    Array.forEach = function(obj, callback, thisObj) {
        for (var i = 0,len = obj.length; i < len; i++)
            callback.call(thisObj, obj[i], i, obj);
    };
    Array.prototype.forEach = function(callback, thisObj) {
        for (var i = 0,len = this.length; i < len; i++)
            callback.call(thisObj,  this[i], i, this);
    };
}

abego.toInt = function(s, defaultValue) {
	if (!s) return defaultValue;
	var n = parseInt(s);
	return (n == NaN) ? defaultValue : n;
};

abego.createEllipsis = function(place) {
	var e = createTiddlyElement(place,"span");
	e.innerHTML = "&hellip;";
};

//#concept Object
//
abego.shallowCopy = function(object) {
	if (!object)
		return object;
	var result = {};
	for (var n in object) 
		result[n] = object[n];
	return result;
};

// Returns a shallow copy of the options, or a new, empty object if options is null/undefined.
//
// @param options [may be null/undefined]
//
//#concept Object, Options
//#import abego.shallowCopy
//
abego.copyOptions = function(options) {
	return !options ? {} : abego.shallowCopy(options);
};

//#import abego.define-namespace
// returns the number of occurances of s in the text
abego.countStrings = function(text, s) {
	if (!s)
		return 0;
		
	var len = s.length;
	var n = 0;
	var lastIndex = 0;
	while (1) {
		var i = text.indexOf(s, lastIndex);
		if (i < 0)
			return n;
		n++;
		lastIndex = i+len;
	}
	return n;
};// Returns the content of the first "braced" text {...}
// Also takes care of nested braces
//
// Returns undefined when no braced text is found or it is not properly nested
//
// @param [optional] when defined and a braced text is found lastIndexRef.lastIndex will contain the index of the char following the (final) closing brace on return.
//
abego.getBracedText = function(text, offset,lastIndexRef) {
	if (!offset) offset = 0;
	var re = /\{([^\}]*)\}/gm;
	re.lastIndex = offset;
	var m = re.exec(text);
	if (m) {
		// The matching stopped at the first closing brace.
		// But if the matched text contains opening braces 
		// this is not the final closing brace.
		// Handle this case specially, find the "corresponding" closing brace
		var s = m[1];
		var nExtraOpenBrace = abego.countStrings(s,"{");
		
		if (!nExtraOpenBrace) {
			if (lastIndexRef)
				lastIndexRef.lastIndex = re.lastIndex;
			// simple case: no nested braces
			return s;
		}

		// special case: "nested braces"
		var len = text.length;
		for (var i = re.lastIndex; i < len && nExtraOpenBrace; i++) {
			var c = text.charAt(i);
			if (c == "{") 
				nExtraOpenBrace++;
			else if (c == "}")
				nExtraOpenBrace--;
		}
		if (!nExtraOpenBrace) {
			// found the corresponding "}".
			if (lastIndexRef)
				lastIndexRef.lastIndex = i-1;
			return text.substring(m.index+1, i-1);
		}
	}
	
	// no return means: return undefined;
};

// Returns an array with those items from the array that pass the given test
//
// @param test an one-arg boolean function that returns true when the item should be added.
// @param testObj [optional] the receiver for the test function (global if undefined or null)
// @param result [optional] an array. When define the selected items are added to this array, otherwise a new array is used.
//
//#import Array.prototype.forEach
//
abego.select = function(array,test,testObj,result) {
	if (!result) result = [];
	array.forEach(function(t) {
		if (test.call(testObj,t)) 
			result.push(t);
		});
	return result;
};

// A portable way to "consume an event"
// 
// (Uses "stopPropagation" and "preventDefault", but will also "cancelBubble",
// even though this is a "non-standard method" , just in case).
//
abego.consumeEvent = function(e) {
	if (e.stopPropagation) e.stopPropagation();
	if (e.preventDefault) e.preventDefault();
	e.cancelBubble = true;
	e.returnValue = true;
};

// Class abego.TiddlerFilterTerm =================================================================
//
// Used to check if a tiddler contains a given text.
//
// A list of fields (standard and/or extended) may be specified to restrict the search to certain fields. 
//
// When no explicit fields are given the fields defined by defaultFields are checked, plus all extended 
// fields (when options.withExtendedFields is true).
//
// @param options [may be null/undefined]
//		options.fields @seeParam abego.MultiFieldRegExpTester.fields
// 		options.withExtendedFields @seeParam abego.MultiFieldRegExpTester.withExtendedFields  
// 		options.caseSensitive [Default: false]
// 		options.fullWordMatch [Default: false]
// 		options.textIsRegExp [Default: false] when true the given text is already a regExp
//
//#import abego.MultiFieldRegExpTester
//
abego.TiddlerFilterTerm = function(text,options) {
	if (!options) options = {};

	var reText = text;
	if (!options.textIsRegExp) {
		reText = text.escapeRegExp();
		if (options.fullWordMatch) 
			reText = "\\b"+reText+"\\b";
	}
	var regExp = new RegExp(reText, "m"+(options.caseSensitive ? "" : "i"));

	this.tester = new abego.MultiFieldRegExpTester(regExp, options.fields, options.withExtendedFields);
}

abego.TiddlerFilterTerm.prototype.test = function(tiddler) {
	return this.tester.test(tiddler);
}

// Recognize a string like
//     "Some Title. Some content text #Tag1 #Tag2 Tag3"
// with the tags and the text being optional.
// Also the period at the end of the title is optional when no content text is specified)
//
// Returns the result in an object with properties "title" and "params",
// with "params" following the parseParams format, containing the "tag" and "text" arguments.
//
abego.parseNewTiddlerCommandLine = function(s) {
	var m = /(.*?)\.(?:\s+|$)([^#]*)(#.*)?/.exec(s);
	if (!m) 
		m = /([^#]*)()(#.*)?/.exec(s);
	if (m) {
		var r;
		if (m[3]) {
			var s2 = m[3].replace(/#/g,"");
			r = s2.parseParams("tag");
		} else
			r = [[]];
			
		// add the text parameter
		var text = m[2]?m[2].trim():"";
		r.push({name: "text", value: text});
		r[0].text = [text];
		
		return {title: m[1].trim(), params: r}; 
	} else
		return {title: s.trim(),params: [[]]};
}	
// 		options.defaultFields [@seeOptionDefault abego.TiddlerFilterTerm.fields] fields to check when no fields are explicitly specified in queryText.
// 		options.withExtendedFields [@seeOptionDefault abego.TiddlerFilterTerm.withExtendedFields] when true and no fields are explicitly specified in queryText also the extended fields are considered (in addition to the ones in defaultFields).
// @seeOptions abego.TiddlerFilterTerm (-fields -fullWordMatch -withExtendedFields)
//
//#import abego.getBracedText
//#import abego.copyOptions
//#import abego.TiddlerFilterTerm
//
abego.parseTiddlerFilterTerm = function(queryText,offset,options) {
	
	// group 1: {...} 		(JavaScript expression)
	// group 2: '=' 		(full word match (optional))
	// group 3: [!%#] 		(field selection short cuts)
	// group 4: fieldName ':'
	// group 5: String literal "..."
	// group 6: RegExp literal /.../
	// group 7: scheme '://' nonSpaceChars
	// group 8: word
	var re = /\s*(?:(?:\{([^\}]*)\})|(?:(=)|([#%!])|(?:(\w+)\s*\:(?!\/\/))|(?:(?:("(?:(?:\\")|[^"])+")|(?:\/((?:(?:\\\/)|[^\/])+)\/)|(\w+\:\/\/[^\s]+)|([^\s\)\-\"]+)))))/mg; // " <- The syntax highlighting of my editors gets confused without this quote
	var shortCuts = {'!':'title','%':'text','#':'tags'};
	
	var fieldNames = {};
	var fullWordMatch;
	re.lastIndex = offset;
	while (1) {
		var i = re.lastIndex;
		var m = re.exec(queryText);
		if (!m || m.index != i) 
			throw "Word or String literal expected";
		if (m[1]) {
			var lastIndexRef = {};
			var code = abego.getBracedText(queryText,0,lastIndexRef);
			if (!code)
				throw "Invalid {...} syntax";
			var f = Function("tiddler","return ("+code+");");
			return {func: f,
					lastIndex:lastIndexRef.lastIndex,
					markRE: null};
		}
		if (m[2])
			fullWordMatch = true;
		else if (m[3]) 
			fieldNames[shortCuts[m[3]]] = 1;
		else if (m[4]) 
			fieldNames[m[4]] = 1;
		else {
			var textIsRegExp = m[6];
			var text = m[5] ? window.eval(m[5]) : m[6] ? m[6] :  m[7] ? m[7] : m[8];
			
			var options = abego.copyOptions(options);
			options.fullWordMatch = fullWordMatch;
			options.textIsRegExp = textIsRegExp;

			var fields = [];
			for (var n in fieldNames)
				fields.push(n);
			if (fields.length == 0) {
				options.fields = options.defaultFields;
			} else {
				options.fields = fields;
				options.withExtendedFields	= false;
			}	
			var term = new abego.TiddlerFilterTerm(text,options);
			var markREText = textIsRegExp ? text : text.escapeRegExp();
			if (markREText && fullWordMatch)
				markREText = "\\b"+markREText+"\\b";
			return {func: function(tiddler) {return term.test(tiddler);},
					lastIndex:re.lastIndex,
					markRE: markREText ? "(?:"+markREText+")" : null};
		}
	}
};

// Class abego.BoolExp =================================================================
//
// Allows the execution/evaluation of a boolean expression, according to this syntax:
//
// boolExpression    : unaryExpression (("AND"|"OR"|"&&"|"||")? unaryExpression)*
//                   ;
//
// unaryExpression   : ("not"|"-")? primaryExpression
//                   ;
//
// primaryExpression : "(" boolExpression ")" 
//                   | Term
//                   ;
//
// For flexibility the Term syntax is defined by a separate parse function.
//
// Notice that there is no precedence between "AND" and "OR" operators, i.e. they are evaluated from left to right.
//
// To evaluate the expression in a given context use code like this:
//
//	var be = new abego.BoolExp(s, termParseFunc);
//  var result = be.exec(context);
// 
// @param s the text defining the expression 
// @param parseTermFunc a Function(text,offset,options) that parses the text starting at offset for a "Term" and returns an object with properties {func: Function(context), lastIndex: ...}. func is the function to be used to evaluate the term in the given context.
// @param options [may be null/undefined] (is also passed to the parseTermFunc)
// 			options.defaultOperationIs_OR [Default: false] When true the concatenation of unaryExpressions (without an operator) is interpreted as an "OR", otherwise as an "AND".
// 			options.caseSensitive [default: false]
//
abego.BoolExp = function(s, parseTermFunc, options) {
	this.s = s;
	var defaultOperationIs_OR = options && options.defaultOperationIs_OR;
	
	var reStart = /\s*(?:(\-|not)|(\())/gi; 		// group 1: NOT, group2 "("
	var reCloseParenthesis = /\s*\)/g;  			// match )
	var reAndOr = /\s*(?:(and|\&\&)|(or|\|\|))/gi; 	// group 1: AND, group 2: OR
	var reNonWhiteSpace = /\s*[^\)\s]/g;
	
	var reNot_Parenthesis = /\s*(\-|not)?(\s*\()?/gi;
	
	var parseBoolExpression; //#Pre-declare function name to avoid problem with "shrinkSafe"
	
	var parseUnaryExpression = function(offset) {
		reNot_Parenthesis.lastIndex = offset;
		var m = reNot_Parenthesis.exec(s);
		var negate;
		var result;
		if (m && m.index == offset) {
			offset += m[0].length;
			negate = m[1];
			if (m[2]) {
				// case:  (...)
				var e = parseBoolExpression(offset);
				reCloseParenthesis.lastIndex = e.lastIndex;
				if (!reCloseParenthesis.exec(s))
					throw "Missing ')'";
				result = {func: e.func, lastIndex: reCloseParenthesis.lastIndex, markRE: e.markRE};
			}
		}
		if (!result)
			result = parseTermFunc(s,offset,options);

		if (negate) {
			result.func = (function(f){return function(context) {return !f(context);}})(result.func);
			// don't mark patterns that are negated
			// (This is essential since the marking may also be used to calculate "ranks". If we
			// would also count the negated matches (i.e. that should not exist) the rank may get too high)
			result.markRE = null;
		}
		return result;
	};

	parseBoolExpression = function(offset) {
		var result = parseUnaryExpression(offset);
		while (1) {
			var l = result.lastIndex;
			reAndOr.lastIndex = l;
			var m = reAndOr.exec(s);
			var isOrCase;
			var nextExp;
			if (m && m.index == l) {
				isOrCase = !m[1];
				nextExp = parseUnaryExpression(reAndOr.lastIndex);
			} else {
				// no "AND" or "OR" found. 
				// Maybe it is a concatenations of parseUnaryExpression without operators
				try {
					nextExp = parseUnaryExpression(l);
				} catch (e) {
					// no unary expression follows. We are done
					return result;
				}
				isOrCase = defaultOperationIs_OR;
			}
			result.func = (function(func1, func2, isOrCase) {
					return isOrCase
						? function(context) {return func1(context) || func2(context);}
						: function(context) {return func1(context) && func2(context);};
				})(result.func,nextExp.func,isOrCase);
			result.lastIndex = nextExp.lastIndex;
			if (!result.markRE)
				result.markRE = nextExp.markRE;
			else if (nextExp.markRE) 
				result.markRE = result.markRE + "|" + nextExp.markRE;
		}
	};
	
	var expr = parseBoolExpression(0);
	this.evalFunc = expr.func;
	if (expr.markRE)
		this.markRegExp = new RegExp(expr.markRE, options.caseSensitive ? "mg" : "img");
}

abego.BoolExp.prototype.exec = function() {
	return this.evalFunc.apply(this,arguments);
};

abego.BoolExp.prototype.getMarkRegExp = function() {
	return this.markRegExp;
};

abego.BoolExp.prototype.toString = function() {
	return this.s;
};

// Class abego.MultiFieldRegExpTester ==================================================================
//
// @param fields [optional; Default: ["title","text","tags"]] array of names of fields to be considered
// @param withExtendedFields [optional; Default: false] when true also extended fields are considered (in addition to the ones given in 'fields')
//
abego.MultiFieldRegExpTester = function(re, fields, withExtendedFields) {
	this.re = re;
	this.fields = fields ? fields : ["title","text","tags"];
	this.withExtendedFields = withExtendedFields;
}

// Returns the name of the first field found that value succeeds the given test,
// or null when no such field is found
//
abego.MultiFieldRegExpTester.prototype.test = function(tiddler) {
	var re = this.re;
	// Check the fields explicitly specified
	for (var i = 0; i < this.fields.length; i++) {
		var s = store.getValue(tiddler, this.fields[i]);
		if (typeof s == "string" && re.test(s))
			return this.fields[i];		
	}
	// Check the extended fields (if required)
	if (this.withExtendedFields) 
		return store.forEachField(
				tiddler,
				function(tiddler, fieldName, value) {
					return typeof value == "string" && re.test(value)?fieldName:null;
				}, true);
		
	return null;
}

// Class abego.TiddlerQuery ==================================================================
//
//#import abego.select
//#import abego.MultiFieldRegExpTester
//
abego.TiddlerQuery = function(queryText,caseSensitive,useRegExp,defaultFields,withExtendedFields) {
	if (useRegExp) {
		this.regExp = new RegExp(queryText, caseSensitive ? "mg" : "img");
		this.tester = new abego.MultiFieldRegExpTester(this.regExp, defaultFields, withExtendedFields);
	} else {
		this.expr = new abego.BoolExp(
				queryText,
				abego.parseTiddlerFilterTerm, {
				defaultFields: defaultFields,
				caseSensitive: caseSensitive,
				withExtendedFields: withExtendedFields});
	}
	
	this.getQueryText = function() {
		return queryText;
	};
	this.getUseRegExp = function() {
		return useRegExp;
	};
	this.getCaseSensitive = function() {
		return caseSensitive;
	};
	this.getDefaultFields = function() {
		return defaultFields;
	};
	this.getWithExtendedFields = function() {
		return withExtendedFields;
	};
}

// Returns true iff the query includes the given tiddler
//
// @param tiddler [may be null/undefined]
//
abego.TiddlerQuery.prototype.test = function(tiddler) {
	if (!tiddler) return false;
	if (this.regExp) {
		return this.tester.test(tiddler);
	}
	return this.expr.exec(tiddler);
};

// Returns an array with those tiddlers from the tiddlers array that match the query.
//
abego.TiddlerQuery.prototype.filter = function(tiddlers) {
	return abego.select(tiddlers,this.test,this);
};

abego.TiddlerQuery.prototype.getMarkRegExp = function() {
	if (this.regExp) {
		// Only use the regExp for marking when it does not match the empty string.
		return "".search(this.regExp) >= 0 ? null :  this.regExp;
	}
	return this.expr.getMarkRegExp();
};

abego.TiddlerQuery.prototype.toString = function() {
	return (this.regExp ? this.regExp : this.expr).toString();
};

// Class abego.PageWiseRenderer ================================================
//
// Subclass or instance must implement getItemsPerPage function;
// They should also implement onPageChanged and refresh the container of the
// PageWiseRenderer on that event.
//
//#import abego.toInt
//
abego.PageWiseRenderer = function() {
	this.firstIndexOnPage = 0; // The index of the first item of the lastResults list displayed on the search result page
};

merge(abego.PageWiseRenderer.prototype, {
	setItems: function(items) {
		this.items = items;
		this.setFirstIndexOnPage(0);
	},
	
	// Maximum number of pages listed in the navigation bar (before or after the current page)
	//
	getMaxPagesInNavigation: function() {
		return 10;
	},
	
	getItemsCount: function(items) {
		return this.items ? this.items.length : 0;
	},
	
	getCurrentPageIndex: function() {
		return Math.floor(this.firstIndexOnPage / this.getItemsPerPage());
	},
	
	getLastPageIndex: function() {
		return Math.floor((this.getItemsCount()-1) / this.getItemsPerPage())
	},
	
	setFirstIndexOnPage: function(index) {
		this.firstIndexOnPage = Math.min(Math.max(0, index), this.getItemsCount()-1);
	},
	
	getFirstIndexOnPage: function() {
		// Ensure that the firstIndexOnPage is really a page start. 
		// This may have become violated when getItemsPerPage has changed,
		// (e.g. when switching between previewText and simple mode.)
		this.firstIndexOnPage = Math.floor(this.firstIndexOnPage / this.getItemsPerPage()) * this.getItemsPerPage();
	
		return this.firstIndexOnPage;
	},
	
	getLastIndexOnPage: function() {
		return Math.min(this.getFirstIndexOnPage()+this.getItemsPerPage()-1, this.getItemsCount()-1);
	},
	
	onPageChanged: function(pageIndex,oldPageIndex) {
	},
	
	renderPage: function(itemRenderer) {
		if (itemRenderer.beginRendering)
			itemRenderer.beginRendering(this);
		try {
			// When there are items found add them to the result page (pagewise)
			if (this.getItemsCount()) {
				// Add the items of the current page
				var lastIndex = this.getLastIndexOnPage();
				var iInPage = -1;
				for (var i=this.getFirstIndexOnPage(); i <= lastIndex; i++) {
					iInPage++;
					
					itemRenderer.render(this,this.items[i],i,iInPage);
				}
			}
		} finally {
			if (itemRenderer.endRendering)
				itemRenderer.endRendering(this);
		}
	},
	
	addPageNavigation: function(place) {
		if (!this.getItemsCount()) return;
	
		var self = this;
		var onNaviButtonClick = function(e) {
			if (!e) var e = window.event;

			abego.consumeEvent(e);

			var pageIndex = abego.toInt(this.getAttribute("page"),0);
			var oldPageIndex = self.getCurrentPageIndex();
			if (pageIndex == oldPageIndex)
				return;
			var index = pageIndex * self.getItemsPerPage();
			self.setFirstIndexOnPage(index);
			self.onPageChanged(pageIndex,oldPageIndex);	
		};
	
		var button;
		var currentPageIndex = this.getCurrentPageIndex();
		var lastPageIndex = this.getLastPageIndex();
		if (currentPageIndex > 0) {
			button = createTiddlyButton(place, "Previous", "Go to previous page (Shortcut: Alt-'<')", onNaviButtonClick, "prev");
			button.setAttribute("page",(currentPageIndex-1).toString());
			button.setAttribute("accessKey","<");
		}
	
		for (var i = -this.getMaxPagesInNavigation(); i < this.getMaxPagesInNavigation(); i++) {
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
	}
});

// Class abego.LimitedTextRenderer ===========================================================
//
// Renders a given text, ensuring that a given limit of number of characters 
// is not exceeded.
//
// A "markRegExp" may be specified. Substring matching this regular expression 
// ("matched strings") are rendered with the class "marked". 
//
// if the given text is longer than the limit the matched strings are preferred 
// to be included in the rendered text (with some leading and trailing "context text"). 
// 
// Example:
//     var renderer = new abego.LimitedTextRenderer();
//
//     var place = ... // a DOM element that should contain the rendered (limited) text
//     var s = "This is another 'Hello World' example, as saying 'Hello' is always nice. So let's say it again: >Hello!<";
//     var maxLen = 50;
//     var markRE = /hello/gi;
//     renderer.render(place,s,maxLen,markRE);
// 
//#import abego.createEllipsis
//
abego.LimitedTextRenderer = function() {
	var minMatchWithContextSize = 40; 
	var maxMovementForWordCorrection = 4; // When a "match" context starts or end on a word the context borders may be changed to at most this amount to include or exclude the word.
	
	
	//----------------------------------------------------------------------------
	//
	// Ranges
	//
	// Objects with a "start" and "end" property (not a specific class). 
	// 
	// In a corresponding "Ranges array" these objects are sorted by their start 
	// and no Range object intersects/touches any other in the array.
	//
	//----------------------------------------------------------------------------
	
	// Adds the Range [startIndex,endIndex[ to the ranges, ensuring that the Ranges
	// in the array are sorted by their start and no Range object 
	// intersects/touches any other in the array (i.e. possibly the new Range is 
	// "merged" with existing ranges)
	//
	// @param ranges array of Range objects
	//
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
	
	// Returns the total size of all Ranges in ranges
	//
	var getTotalRangesSize = function(ranges) {
		var totalRangeSize = 0;
		for (var i=0; i < ranges.length; i++) {
			var range = ranges[i];
			totalRangeSize += range.end-range.start;
		}
		return totalRangeSize;
	};
	
	//----------------------------------------------------------------------------
	
	
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
	
	
	
	var getMatchedTextCount = function(textAndMatches) {
		var result = 0;
		for (var i=0; i < textAndMatches.length; i++) {
			if (textAndMatches[i].isMatch) {
				result++;
			}
		}
		return result;	
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
				abego.createEllipsis(place);
			}
		};
		
		// When the first range is not at the start of the text write an ellipsis("...")
		// (Ellipses between ranges are written in the writeTextAndMatchRange method)
		if (ranges[0].start > 0) abego.createEllipsis(place);
	
		var remainingLen = maxLen;
		for (var i = 0; i < ranges.length && remainingLen > 0; i++) {
			var range = ranges[i];
			var len = Math.min(range.end - range.start, remainingLen);
			writeTextAndMatchRange(place, s, textAndMatches, range.start, range.start+len);
			remainingLen -= len;
		}
	};
	
	this.render = function(place,s,maxLen,markRegExp) {
		if (s.length < maxLen) maxLen = s.length;
		
		var textAndMatches = getTextAndMatchArray(s, markRegExp);
		
		var ranges = getMatchedTextWithContextRanges(textAndMatches, s, maxLen);
		
		// When the maxLen is not yet reached add more ranges 
		// starting from the beginning until either maxLen or 
		// the end of the string is reached.
		fillUpRanges(s, ranges, maxLen);
	
		writeRanges(place, s, textAndMatches, ranges, maxLen);
	};
};



(function() {

function alertAndThrow(msg) {
	alert(msg);
	throw msg;
};

if (version.major < 2 || (version.major == 2 && version.minor < 1)) 
	alertAndThrow("YourSearchPlugin requires TiddlyWiki 2.1 or newer.\n\nCheck the archive for YourSearch plugins\nsupporting older versions of TiddlyWiki.\n\nArchive: http://tiddlywiki.abego-software.de/archive");

abego.YourSearch = {};

//----------------------------------------------------------------------------
// The Search Core
//----------------------------------------------------------------------------

// Model Variables
var lastResults; // Array of tiddlers that matched the last search
var lastQuery; // The last Search query (TiddlerQuery)

var setLastResults = function(array) {
	lastResults = array;
};

var getLastResults = function() {
	return lastResults ? lastResults : [];
};

var getLastResultsCount = function() {
	return lastResults ? lastResults.length : 0;
};

// Standard Ranking Weights
var matchInTitleWeight = 4;
var precisionInTitleWeight = 10;
var matchInTagsWeight = 2;

var getMatchCount = function(s, re) {
	var m = s.match(re);
	return m ? m.length : 0;
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
	lastQuery = null;
	
	var candidates = store.reverseLookup("tags",excludeTag,false);
	try {
		var defaultFields = [];
		if (config.options.chkSearchInTitle) defaultFields.push("title");
		if (config.options.chkSearchInText) defaultFields.push("text");
		if (config.options.chkSearchInTags) defaultFields.push("tags");
		lastQuery = new abego.TiddlerQuery(
				searchText,caseSensitive, useRegExp,defaultFields,config.options.chkSearchExtendedFields); 
	} catch (e) {
		// when an invalid query is given no tiddlers are matched
		return [];
	}

	var results = lastQuery.filter(candidates);

	// Rank the results
	var rankFunction = abego.YourSearch.getRankFunction();
	for (var i = 0; i < results.length; i++) {
		var tiddler = results[i];
		var rank = rankFunction(tiddler, lastQuery);
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
	return results;
};

//----------------------------------------------------------------------------
// The Search UI (Result page)
//----------------------------------------------------------------------------


// Visual appearance of the result page
var maxCharsInTitle = 80;
var maxCharsInTags = 50;
var maxCharsInText = 250;
var maxCharsInField = 50;

var itemsPerPageDefault = 25; // Default maximum number of items on one search result page
var itemsPerPageWithPreviewDefault = 10; // Default maximum number of items on one search result page when PreviewText is on

// DOM IDs
var yourSearchResultID = "yourSearchResult";
var yourSearchResultItemsID = "yourSearchResultItems";

var lastSearchText; // The last search text, as passed to findMatches

var resultElement; // The (popup) DOM element containing the search result [may be null]
var searchInputField; // The "search" input field
var searchButton; // The "search" button
var lastNewTiddlerButton;

var initStylesheet = function() {
	if (version.extensions.YourSearchPlugin.styleSheetInited) 
		return;
		
	version.extensions.YourSearchPlugin.styleSheetInited = true;
	setStylesheet(store.getTiddlerText("YourSearchStyleSheet"),"yourSearch");
}

var isResultOpen = function() {
	return resultElement != null && resultElement.parentNode == document.body;
};

var closeResult = function() {
	if (isResultOpen()) {
		document.body.removeChild(resultElement);
	}
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

var scrollVisible = function() {
	// Scroll the window to make the result page (and the search Input field) visible.
	if (resultElement) window.scrollTo(0,ensureVisible(resultElement));
	if (searchInputField) window.scrollTo(0,ensureVisible(searchInputField));
};

// Makes sure the result page has a good size and position and visible
// (may scroll the window)
//
var	ensureResultIsDisplayedNicely = function() {
	adjustResultPositionAndSize();
	scrollVisible();
};



var indexInPage; // The index (in the current page) of the tiddler currently rendered.
var currentTiddler; // While rendering the page the tiddler that is currently rendered.

var pager = new abego.PageWiseRenderer();

var MyItemRenderer = function(parent) {
	// Load the template how to display the items that represent a found tiddler
	this.itemHtml = store.getTiddlerText("YourSearchItemTemplate");
	if (!this.itemHtml) alertAndThrow("YourSearchItemTemplate not found");
	
	// Locate the node that shall contain the list of found tiddlers
	this.place = document.getElementById(yourSearchResultItemsID);
	if(!this.place)
		this.place = createTiddlyElement(parent,"div",yourSearchResultItemsID);
};

merge(MyItemRenderer.prototype,{
	render: function(pager,object,index,indexOnPage) {
		// Define global variables, referenced by macros during applyHtmlMacros
		indexInPage = indexOnPage;
		currentTiddler = object;
		
		var item = createTiddlyElement(this.place,"div",null, "yourSearchItem");
		item.innerHTML = this.itemHtml;
		applyHtmlMacros(item,null);
		refreshElements(item,null);
	},

	endRendering: function(pager) {
		// The currentTiddler must only be defined while rendering the found tiddlers
		currentTiddler = null;
	}
});

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

	// Expand the template macros etc.
	applyHtmlMacros(resultElement,null);
	refreshElements(resultElement,null);
	
	var itemRenderer = new MyItemRenderer(resultElement);
	pager.renderPage(itemRenderer);

	ensureResultIsDisplayedNicely();
};

pager.getItemsPerPage = function() {
	var n = (config.options.chkPreviewText) 
			? abego.toInt(config.options.txtItemsPerPageWithPreview, itemsPerPageWithPreviewDefault) 
			: abego.toInt(config.options.txtItemsPerPage, itemsPerPageDefault);
	return (n > 0) ? n : 1;
};

pager.onPageChanged = function() {
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
			abego.YourSearch.onShowResult(true);
		}
	}
};


var invalidateResult = function() {
	closeResult();
	resultElement = null;
	lastSearchText = null;
};



//-------------------------------------------------------------------------
// Close the search result page when the user clicks on the document
// (and not into the searchInputField, on the search button or in the result)
// or presses the ESC key

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

var onDocumentClick = function(e) {
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


// Our Search Macro Hijack Function ==========================================

// Helper
var myStorySearch = function(text,useCaseSensitive,useRegExp)
{
	lastSearchText = text;
	setLastResults(findMatches(store, text,useCaseSensitive,useRegExp,"title","excludeSearch"));

	abego.YourSearch.onShowResult();
};


var myMacroSearchHandler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	initStylesheet();

	lastSearchText = "";
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
		searchInputField = this;
		switch(e.keyCode)
			{
			case 13:
				if (e.ctrlKey && lastNewTiddlerButton && isResultOpen())
					lastNewTiddlerButton.onclick.apply(lastNewTiddlerButton,[e]);
				else
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
		if(this.value.length > 2)
			{
		 	if (this.value != lastSearchText)
		 		{
				if (!config.options.chkUseYourSearch || config.options.chkSearchAsYouType)
					{
					if(searchTimeout)
						clearTimeout(searchTimeout);
					var txt = this;
					searchTimeout = setTimeout(function() {doSearch(txt);},500);
					}
				}
			else
				{
				if(searchTimeout)
					clearTimeout(searchTimeout);
				}
			};
		if (this.value.length == 0) 
			{
			closeResult();
			}
		};


	var focusHandler = function(e)
		{
		this.select();
		clearMessage();
		reopenResultIfApplicable();
		};

	
	var args = paramString.parseParams("list",null,true);
	var buttonAtRight = getFlag(args, "buttonAtRight");
	var sizeTextbox = getParam(args, "sizeTextbox", this.sizeTextbox);
	
	var btn;
	if (!buttonAtRight)
		btn = createTiddlyButton(place,this.label,this.prompt,clickHandler);
		
	var txt = createTiddlyElement(null,"input",null,"txtOptionInput searchField",null);
	if(params[0])
		txt.value = params[0];
	txt.onkeyup = keyHandler;
	txt.onfocus = focusHandler;
	txt.setAttribute("size",sizeTextbox);
	txt.setAttribute("accessKey",this.accessKey);
	txt.setAttribute("autocomplete","off");
	if(config.browser.isSafari)
		{
		txt.setAttribute("type","search");
		txt.setAttribute("results","5");
		}
	else
		txt.setAttribute("type","text");

	if(place)
		place.appendChild(txt);

	if (buttonAtRight)
		btn = createTiddlyButton(place,this.label,this.prompt,clickHandler);

	searchInputField = txt;
	searchButton = btn;
};

//----------------------------------------------------------------------------
// Support for Macros
//----------------------------------------------------------------------------

var openAllFoundTiddlers = function() {
	closeResult();
	var results = getLastResults();
	var n = results.length;
	if (n) {
		var titles=[];
		for(var i = 0; i<n; i++)
			titles.push(results[i].title);
		story.displayTiddlers(null,titles);
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

var removeTextDecoration = function(s) {
	var removeThis = ["''", "{{{", "}}}", "//", "<<<", "/***", "***/"];
	var reText = "";
	for (var i = 0; i < removeThis.length; i++) {
		if (i != 0) reText += "|";
		reText += "("+removeThis[i].escapeRegExp()+")";
	}
	return s.replace(new RegExp(reText, "mg"), "").trim();
};



// Returns the "shortcut number" of the currentTiddler. 
// I.e. When the user presses Alt-n the given tiddler is opened/display.
//
// @return 0-9 or -1 when no number is defined
//
var getShortCutNumber = function() {
	var i = indexInPage;
	return (i >= 0 && i <= 9) 
		? (i < 9 ? (i+1) : 0)
		: -1;
};

var limitedTextRenderer = new abego.LimitedTextRenderer();
var renderLimitedText = function(place, s, maxLen) {
	limitedTextRenderer.render(place,s,maxLen,lastQuery.getMarkRegExp())
}

// When any tiddler are changed reset the result.
// 
var oldTiddlyWikiSaveTiddler = TiddlyWiki.prototype.saveTiddler;
TiddlyWiki.prototype.saveTiddler = function(title,newTitle,newBody,modifier,modified,tags,fields) {
	oldTiddlyWikiSaveTiddler.apply(this, arguments);
	invalidateResult();
};
var oldTiddlyWikiRemoveTiddler = TiddlyWiki.prototype.removeTiddler;
TiddlyWiki.prototype.removeTiddler = function(title) {
	oldTiddlyWikiRemoveTiddler.apply(this, arguments);
	invalidateResult();
};

//----------------------------------------------------------------------------
// Macros
//----------------------------------------------------------------------------

// ====Macro yourSearch ================================================

config.macros.yourSearch = {
	// Standard Properties
	label: "yourSearch",
	prompt: "Gives access to the current/last YourSearch result",
	
	handler: function(place,macroName,params,wikifier,paramString,tiddler) {
		if (params.length == 0) return;
	
		var name = params[0];
		var func = config.macros.yourSearch.funcs[name];
		if (func) func(place,macroName,params,wikifier,paramString,tiddler);
	},
	
	tests: {
		"true" : function() {return true;},
		"false" : function() {return false;},
		"found" : function() {return getLastResultsCount() > 0;},
		"previewText" : function() {return config.options.chkPreviewText;}
	},

	funcs: {
		itemRange: function(place) {
			if (getLastResultsCount()) {
				var lastIndex = pager.getLastIndexOnPage();
				var s = "%0 - %1".format([pager.getFirstIndexOnPage()+1,lastIndex+1]);
				createTiddlyText(place, s);
			}
		},
		
		count: function(place) {
			createTiddlyText(place, getLastResultsCount().toString());
		},
		
		query: function(place) {
			if (lastQuery) {
				createTiddlyText(place, lastQuery.toString());
			}
		},
		
		version: function(place) {
			var t = "YourSearch %0.%1.%2".format(
					[version.extensions.YourSearchPlugin.major, 
					 version.extensions.YourSearchPlugin.minor, 
					 version.extensions.YourSearchPlugin.revision]);
			var e = createTiddlyElement(place, "a");
			e.setAttribute("href", "http://tiddlywiki.abego-software.de/#YourSearchPlugin");
			e.innerHTML = '<font color="black" face="Arial, Helvetica, sans-serif">'+t+'<font>';
		},
		
		copyright: function(place) {
			var e = createTiddlyElement(place, "a");
			e.setAttribute("href", "http://www.abego-software.de");
			e.innerHTML = '<font color="black" face="Arial, Helvetica, sans-serif">&copy; 2005-2008 <b><font color="red">abego</font></b> Software<font>';
		},
		
		newTiddlerButton: function(place) {
			if (lastQuery) {
				var r = abego.parseNewTiddlerCommandLine(lastQuery.getQueryText());
				var btn = config.macros.newTiddler.createNewTiddlerButton(place,r.title,r.params,"new tiddler","Create a new tiddler based on search text. (Shortcut: Ctrl-Enter; Separators: '.', '#')",null,"text");				
				// Close the result before the new tiddler is created.
				var oldOnClick = btn.onclick;
				btn.onclick = function() {
					closeResult();
					oldOnClick.apply(this,arguments);
				}
				lastNewTiddlerButton = btn;
			}
		},
		
		linkButton: function(place,macroName,params,wikifier,paramString,tiddler) {
			if (params < 2) return;
			
			var	tiddlyLink = params[1];
			var text = params < 3 ? tiddlyLink : params[2];
			var tooltip = params < 4 ? text : params[3];
			var accessKey = params < 5 ? null : params[4];
			
			var btn = createTiddlyButton(place,text,tooltip,closeResultAndDisplayTiddler,null,null, accessKey);
			btn.setAttribute("tiddlyLink",tiddlyLink);
		},
		
		closeButton: function(place,macroName,params,wikifier,paramString,tiddler) {
			var button = createTiddlyButton(place, "close", "Close the Search Results (Shortcut: ESC)", closeResult);
		},
		
		openAllButton: function(place,macroName,params,wikifier,paramString,tiddler) {
			var n = getLastResultsCount();
			if (n == 0) return;
		
			var title = n == 1 ? "open tiddler" : "open all %0 tiddlers".format([n]);
			var button = createTiddlyButton(place, title, "Open all found tiddlers (Shortcut: Alt-O)", openAllFoundTiddlers);
			button.setAttribute("accessKey","O");
		},
		
		naviBar: function(place,macroName,params,wikifier,paramString,tiddler) {
			pager.addPageNavigation(place);
		},
		
		"if": function(place,macroName,params,wikifier,paramString,tiddler) {
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
		},
		
		chkPreviewText: function(place,macroName,params,wikifier,paramString,tiddler) {
			var optionParams = params.slice(1).join(" ");
			
			var elem = createOptionWithRefresh(place, "chkPreviewText", wikifier,tiddler);
			elem.setAttribute("accessKey", "P");
			elem.title = "Show text preview of found tiddlers (Shortcut: Alt-P)";	
			return elem;
		}
	}
};


// ====Macro foundTiddler ================================================

config.macros.foundTiddler = {
	// Standard Properties
	label: "foundTiddler",
	prompt: "Provides information on the tiddler currently processed on the YourSearch result page",
	
	handler: function(place,macroName,params,wikifier,paramString,tiddler) {
		var name = params[0];
		var func = config.macros.foundTiddler.funcs[name];
		if (func) func(place,macroName,params,wikifier,paramString,tiddler);
	},
		
	funcs: {
		title: function(place,macroName,params,wikifier,paramString,tiddler) {
			if (!currentTiddler) return;
			
			var shortcutNumber = getShortCutNumber();
			var tooltip = shortcutNumber >= 0 
					? "Open tiddler (Shortcut: Alt-%0)".format([shortcutNumber.toString()])
					: "Open tiddler";
		
			var btn = createTiddlyButton(place,null,tooltip,closeResultAndDisplayTiddler,null);
			btn.setAttribute("tiddlyLink",currentTiddler.title);
			btn.setAttribute("withHilite","true");
			
			renderLimitedText(btn, currentTiddler.title, maxCharsInTitle);
		
			if (shortcutNumber >= 0) {
				btn.setAttribute("accessKey",shortcutNumber.toString());
			}
		},
		
		tags: function(place,macroName,params,wikifier,paramString,tiddler) {
			if (!currentTiddler) return;
		
			renderLimitedText(place, currentTiddler.getTags(), maxCharsInTags);
		},
		
		text: function(place,macroName,params,wikifier,paramString,tiddler) {
			if (!currentTiddler) return;
		
			renderLimitedText(place, removeTextDecoration(currentTiddler.text), maxCharsInText);
		},
		
		field:  function(place,macroName,params,wikifier,paramString,tiddler) {
			if (!currentTiddler) return;
			var	name = params[1];
			var len = params.length > 2 ? abego.toInt(params[2],maxCharsInField) : maxCharsInField;
			var v = store.getValue(currentTiddler,name);
			if (v)
				renderLimitedText(place, removeTextDecoration(v), len);
		},
		
		// Renders the "shortcut number" of the current tiddler, to indicate to the user
		// what number to "Alt-press" to open the tiddler.
		//
		number: function(place,macroName,params,wikifier,paramString,tiddler) {
			var numberToDisplay = getShortCutNumber();
			if (numberToDisplay >= 0) {
				var text = "%0)".format([numberToDisplay.toString()]);
				createTiddlyElement(place,"span",null,"shortcutNumber",text);
			}
		}
	}
};


//----------------------------------------------------------------------------
// Configuration Stuff
//----------------------------------------------------------------------------

var opts = {chkUseYourSearch:true,
	chkPreviewText:true,
	chkSearchAsYouType:true,
	chkSearchInTitle:true,
	chkSearchInText:true,
	chkSearchInTags:true,
	chkSearchExtendedFields:true,
	txtItemsPerPage:itemsPerPageDefault,
	txtItemsPerPageWithPreview:itemsPerPageWithPreviewDefault};
for (var n in opts) 
	if (config.options[n] == undefined) config.options[n] = opts[n];




//----------------------------------------------------------------------------
// Shadow Tiddlers
//----------------------------------------------------------------------------

config.shadowTiddlers.AdvancedOptions += "\n<<option chkUseYourSearch>> Use 'Your Search' //([[more options|YourSearch Options]]) ([[help|YourSearch Help]])// ";

config.shadowTiddlers["YourSearch Help"] =
"!Field Search\nWith the Field Search you can restrict your search to certain fields of a tiddler, e.g"+
" only search the tags or only the titles. The general form is //fieldname//'':''//textToSearch// (e."+
"g. {{{title:intro}}}). In addition one-character shortcuts are also supported for the standard field"+
"s {{{title}}}, {{{text}}} and {{{tags}}}:\n|!What you want|!What you type|!Example|\n|Search ''titles "+
"only''|start word with ''!''|{{{!jonny}}} (shortcut for {{{title:jonny}}})|\n|Search ''contents/text "+
"only''|start word with ''%''|{{{%football}}} (shortcut for {{{text:football}}})|\n|Search ''tags only"+
"''|start word with ''#''|{{{#Plugin}}} (shortcut for {{{tags:Plugin}}})|\n\nUsing this feature you may"+
" also search the extended fields (\"Metadata\") introduced with TiddlyWiki 2.1, e.g. use {{{priority:1"+
"}}} to find all tiddlers with the priority field set to \"1\".\n\nYou may search a word in more than one"+
" field. E.g. {{{!#Plugin}}} (or {{{title:tags:Plugin}}} in the \"long form\") finds tiddlers containin"+
"g \"Plugin\" either in the title or in the tags (but does not look for \"Plugin\" in the text). \n\n!Boole"+
"an Search\nThe Boolean Search is useful when searching for multiple words.\n|!What you want|!What you "+
"type|!Example|\n|''All words'' must exist|List of words|{{{jonny jeremy}}} (or {{{jonny and jeremy}}}"+
")|\n|''At least one word'' must exist|Separate words by ''or''|{{{jonny or jeremy}}}|\n|A word ''must "+
"not exist''|Start word with ''-''|{{{-jonny}}} (or {{{not jonny}}})|\n\n''Note:'' When you specify two"+
" words, separated with a space, YourSearch finds all tiddlers that contain both words, but not neces"+
"sarily next to each other. If you want to find a sequence of word, e.g. '{{{John Brown}}}', you need"+
" to put the words into quotes. I.e. you type: {{{\"john brown\"}}}.\n\nUsing parenthesis you may change "+
"the default \"left to right\" evaluation of the boolean search. E.g. {{{not (jonny or jeremy)}}} finds"+
" all tiddlers that contain neither \"jonny\" nor \"jeremy. In contrast to this {{{not jonny or jeremy}}"+
"} (i.e. without parenthesis) finds all tiddlers that either don't contain \"jonny\" or that contain \"j"+
"eremy\".\n\n!'Exact Word' Search\nBy default a search result all matches that 'contain' the searched tex"+
"t. E.g. if you search for {{{Task}}} you will get all tiddlers containing 'Task', but also '~Complet"+
"edTask', '~TaskForce' etc.\n\nIf you only want to get the tiddlers that contain 'exactly the word' you"+
" need to prefix it with a '='. E.g. typing '=Task' will find the tiddlers that contain the word 'Tas"+
"k', ignoring words that just contain 'Task' as a substring.\n\n!~CaseSensitiveSearch and ~RegExpSearch"+
"\nThe standard search options ~CaseSensitiveSearch and ~RegExpSearch are fully supported by YourSearc"+
"h. However when ''~RegExpSearch'' is on Filtered and Boolean Search are disabled.\n\nIn addition you m"+
"ay do a \"regular expression\" search even with the ''~RegExpSearch'' set to false by directly enterin"+
"g the regular expression into the search field, framed with {{{/.../}}}. \n\nExample: {{{/m[ae][iy]er/"+
"}}} will find all tiddlers that contain either \"maier\", \"mayer\", \"meier\" or \"meyer\".\n\n!~JavaScript E"+
"xpression Filtering\nIf you are familiar with JavaScript programming and know some TiddlyWiki interna"+
"ls you may also use JavaScript expression for the search. Just enter a JavaScript boolean expression"+
" into the search field, framed with {{{ { ... } }}}. In the code refer to the variable tiddler and e"+
"valuate to {{{true}}} when the given tiddler should be included in the result. \n\nExample: {{{ { tidd"+
"ler.modified > new Date(\"Jul 4, 2005\")} }}} returns all tiddler modified after July 4th, 2005.\n\n!Com"+
"bined Search\nYou are free to combine the various search options. \n\n''Examples''\n|!What you type|!Res"+
"ult|\n|{{{!jonny !jeremy -%football}}}|all tiddlers with both {{{jonny}}} and {{{jeremy}}} in its tit"+
"les, but no {{{football}}} in content.|\n|{{{#=Task}}}|All tiddlers tagged with 'Task' (the exact wor"+
"d). Tags named '~CompletedTask', '~TaskForce' etc. are not considered.|\n\n!Access Keys\nYou are encour"+
"aged to use the access keys (also called \"shortcut\" keys) for the most frequently used operations. F"+
"or quick reference these shortcuts are also mentioned in the tooltip for the various buttons etc.\n\n|"+
"!Key|!Operation|\n|{{{Alt-F}}}|''The most important keystroke'': It moves the cursor to the search in"+
"put field so you can directly start typing your query. Pressing {{{Alt-F}}} will also display the pr"+
"evious search result. This way you can quickly display multiple tiddlers using \"Press {{{Alt-F}}}. S"+
"elect tiddler.\" sequences.|\n|{{{ESC}}}|Closes the [[YourSearch Result]]. When the [[YourSearch Resul"+
"t]] is already closed and the cursor is in the search input field the field's content is cleared so "+
"you start a new query.|\n|{{{Alt-1}}}, {{{Alt-2}}},... |Pressing these keys opens the first, second e"+
"tc. tiddler from the result list.|\n|{{{Alt-O}}}|Opens all found tiddlers.|\n|{{{Alt-P}}}|Toggles the "+
"'Preview Text' mode.|\n|{{{Alt-'<'}}}, {{{Alt-'>'}}}|Displays the previous or next page in the [[Your"+
"Search Result]].|\n|{{{Return}}}|When you have turned off the 'as you type' search mode pressing the "+
"{{{Return}}} key actually starts the search (as does pressing the 'search' button).|\n\n//If some of t"+
"hese shortcuts don't work for you check your browser if you have other extensions installed that alr"+
"eady \"use\" these shortcuts.//";

config.shadowTiddlers["YourSearch Options"] =
"|>|!YourSearch Options|\n|>|<<option chkUseYourSearch>> Use 'Your Search'|\n|!|<<option chkPreviewText"+
">> Show Text Preview|\n|!|<<option chkSearchAsYouType>> 'Search As You Type' Mode (No RETURN required"+
" to start search)|\n|!|Default Search Filter:<<option chkSearchInTitle>>Title ('!')     <<option chk"+
"SearchInText>>Text ('%')     <<option chkSearchInTags>>Tags ('#')    <<option chkSearchExtendedFiel"+
"ds>>Extended Fields<html><br><font size=\"-2\">The fields of a tiddlers that are searched when you don"+
"'t explicitly specify a filter in the search text <br>(Explictly specify fields using one or more '!"+
"', '%', '#' or 'fieldname:' prefix before the word/text to find).</font></html>|\n|!|Number of items "+
"on search result page: <<option txtItemsPerPage>>|\n|!|Number of items on search result page with pre"+
"view text: <<option txtItemsPerPageWithPreview>>|\n";
			
config.shadowTiddlers["YourSearchStyleSheet"] = 
"/***\n!~YourSearchResult Stylesheet\n***/\n/*{{{*/\n.yourSearchResult {\n\tposition: absolute;\n\twidth: 800"+
"px;\n\n\tpadding: 0.2em;\n\tlist-style: none;\n\tmargin: 0;\n\n\tbackground: #ffd;\n\tborder: 1px solid DarkGra"+
"y;\n}\n\n/*}}}*/\n/***\n!!Summary Section\n***/\n/*{{{*/\n.yourSearchResult .summary {\n\tborder-bottom-width:"+
" thin;\n\tborder-bottom-style: solid;\n\tborder-bottom-color: #999999;\n\tpadding-bottom: 4px;\n}\n\n.yourSea"+
"rchRange, .yourSearchCount, .yourSearchQuery   {\n\tfont-weight: bold;\n}\n\n.yourSearchResult .summary ."+
"button {\n\tfont-size: 10px;\n\n\tpadding-left: 0.3em;\n\tpadding-right: 0.3em;\n}\n\n.yourSearchResult .summa"+
"ry .chkBoxLabel {\n\tfont-size: 10px;\n\n\tpadding-right: 0.3em;\n}\n\n/*}}}*/\n/***\n!!Items Area\n***/\n/*{{{*"+
"/\n.yourSearchResult .marked {\n\tbackground: none;\n\tfont-weight: bold;\n}\n\n.yourSearchItem {\n\tmargin-to"+
"p: 2px;\n}\n\n.yourSearchNumber {\n\tcolor: #808080;\n}\n\n\n.yourSearchTags {\n\tcolor: #008000;\n}\n\n.yourSearc"+
"hText {\n\tcolor: #808080;\n\tmargin-bottom: 6px;\n}\n\n/*}}}*/\n/***\n!!Footer\n***/\n/*{{{*/\n.yourSearchFoote"+
"r {\n\tmargin-top: 8px;\n\tborder-top-width: thin;\n\tborder-top-style: solid;\n\tborder-top-color: #999999;"+
"\n}\n\n.yourSearchFooter a:hover{\n\tbackground: none;\n\tcolor: none;\n}\n/*}}}*/\n/***\n!!Navigation Bar\n***/"+
"\n/*{{{*/\n.yourSearchNaviBar a {\n\tfont-size: 16px;\n\tmargin-left: 4px;\n\tmargin-right: 4px;\n\tcolor: bla"+
"ck;\n\ttext-decoration: underline;\n}\n\n.yourSearchNaviBar a:hover {\n\tbackground-color: none;\n}\n\n.yourSe"+
"archNaviBar .prev {\n\tfont-weight: bold;\n\tcolor: blue;\n}\n\n.yourSearchNaviBar .currentPage {\n\tcolor: #"+
"FF0000;\n\tfont-weight: bold;\n\ttext-decoration: none;\n}\n\n.yourSearchNaviBar .next {\n\tfont-weight: bold"+
";\n\tcolor: blue;\n}\n/*}}}*/\n";

config.shadowTiddlers["YourSearchResultTemplate"] =
"<!--\n{{{\n-->\n<span macro=\"yourSearch if found\">\n<!-- The Summary Header ============================"+
"================ -->\n<table class=\"summary\" border=\"0\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\">"+
"<tbody>\n  <tr>\n\t<td align=\"left\">\n\t\tYourSearch Result <span class=\"yourSearchRange\" macro=\"yourSearc"+
"h itemRange\"></span>\n\t\t&nbsp;of&nbsp;<span class=\"yourSearchCount\" macro=\"yourSearch count\"></span>\n"+
"\t\tfor&nbsp;<span class=\"yourSearchQuery\" macro=\"yourSearch query\"></span>\n\t</td>\n\t<td class=\"yourSea"+
"rchButtons\" align=\"right\">\n\t\t<span macro=\"yourSearch chkPreviewText\"></span><span class=\"chkBoxLabel"+
"\">preview text</span>\n\t\t<span macro=\"yourSearch newTiddlerButton\"></span>\n\t\t<span macro=\"yourSearch openAllButton\"></span>\n\t\t<span macro=\"yourSearch lin"+
"kButton 'YourSearch Options' options 'Configure YourSearch'\"></span>\n\t\t<span macro=\"yourSearch linkB"+
"utton 'YourSearch Help' help 'Get help how to use YourSearch'\"></span>\n\t\t<span macro=\"yourSearch clo"+
"seButton\"></span>\n\t</td>\n  </tr>\n</tbody></table>\n\n<!-- The List of Found Tiddlers ================="+
"=========================== -->\n<div id=\"yourSearchResultItems\" itemsPerPage=\"25\" itemsPerPageWithPr"+
"eview=\"10\"></div>\n\n<!-- The Footer (with the Navigation) ==========================================="+
"= -->\n<table class=\"yourSearchFooter\" border=\"0\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\"><tbody"+
">\n  <tr>\n\t<td align=\"left\">\n\t\tResult page: <span class=\"yourSearchNaviBar\" macro=\"yourSearch naviBar"+
"\"></span>\n\t</td>\n\t<td align=\"right\"><span macro=\"yourSearch version\"></span>, <span macro=\"yourSearc"+
"h copyright\"></span>\n\t</td>\n  </tr>\n</tbody></table>\n<!-- end of the 'tiddlers found' case ========="+
"================================== -->\n</span>\n\n\n<!-- The \"No tiddlers found\" case ================="+
"========================== -->\n<span macro=\"yourSearch if not found\">\n<table class=\"summary\" border="+
"\"0\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\"><tbody>\n  <tr>\n\t<td align=\"left\">\n\t\tYourSearch Resu"+
"lt: No tiddlers found for <span class=\"yourSearchQuery\" macro=\"yourSearch query\"></span>.\n\t</td>\n\t<t"+
"d class=\"yourSearchButtons\" align=\"right\">\n\t\t<span macro=\"yourSearch newTiddlerButton\"></span>\n\t\t<span macro=\"yourSearch linkButton 'YourSearch Options'"+
" options 'Configure YourSearch'\"></span>\n\t\t<span macro=\"yourSearch linkButton 'YourSearch Help' help"+
" 'Get help how to use YourSearch'\"></span>\n\t\t<span macro=\"yourSearch closeButton\"></span>\n\t</td>\n  <"+
"/tr>\n</tbody></table>\n</span>\n\n\n<!--\n}}}\n-->\n";

config.shadowTiddlers["YourSearchItemTemplate"] = 
"<!--\n{{{\n-->\n<span class='yourSearchNumber' macro='foundTiddler number'></span>\n<span class='yourSea"+
"rchTitle' macro='foundTiddler title'/></span>&nbsp;-&nbsp;\n<span class='yourSearchTags' macro='found"+
"Tiddler field tags 50'/></span>\n<span macro=\"yourSearch if previewText\"><div class='yourSearchText' macro='fo"+
"undTiddler field text 250'/></div></span>\n<!--\n}}}\n-->";

config.shadowTiddlers["YourSearch"] = "<<tiddler [[YourSearch Help]]>>";

config.shadowTiddlers["YourSearch Result"] = "The popup-like window displaying the result of a YourSearch query.";

//----------------------------------------------------------------------------
// Install YourSearch
//----------------------------------------------------------------------------

// Overwrite the TiddlyWiki search handler and verify after a while 
// that nobody else has overwritten it.
config.macros.search.handler = myMacroSearchHandler;

var checkForOtherHijacker = function() {
	// Check that still our search handler is installed
    if (config.macros.search.handler != myMacroSearchHandler) {
    	alert(
"Message from YourSearchPlugin:\n\n\nAnother plugin has disabled the 'Your Search' features.\n\n\nYou may "+
"disable the other plugin or change the load order of \nthe plugins (by changing the names of the tidd"+
"lers)\nto enable the 'Your Search' features.");
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

abego.YourSearch.closeResult = function() {
	closeResult();
};

// Returns an array of tiddlers that matched the last search
abego.YourSearch.getFoundTiddlers = function() {
	return lastResults;
};

// The last Search query (TiddlerQuery), or null
abego.YourSearch.getQuery = function() {
	return lastQuery;
};

abego.YourSearch.onShowResult = function(useOldResult) {
	highlightHack = lastQuery ? lastQuery.getMarkRegExp() : null;
	if (!useOldResult)
		pager.setItems(getLastResults());
	if (!resultElement) {
		resultElement = createTiddlyElement(document.body,"div",yourSearchResultID,"yourSearchResult");
	} else if (resultElement.parentNode != document.body) {
		document.body.appendChild(resultElement);
	}
	refreshResult();
	highlightHack = null;
};

})();
} // of "install only once"
// Used Globals (for JSLint) ==============

// ... JavaScript Core
/*global 	alert,clearTimeout,confirm */
// ... TiddlyWiki Core
/*global 	Tiddler, applyHtmlMacros, clearMessage, createTiddlyElement, createTiddlyButton, createTiddlyText, ensureVisible ,findPosX, highlightHack, findPosY,findWindowWidth, invokeMacro, saveChanges, refreshElements, story */
//}}}
/***
!Licence and Copyright
Copyright (c) abego Software ~GmbH, 2005-2010 ([[www.abego-software.de|http://www.abego-software.de]])

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

