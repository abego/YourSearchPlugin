var abego = abego || {};
abego.YourSearchPluginTest = (function() {
	function parseBoolLiteral(text, offset, options) {
		var m = /\s*((false)|(true))/.exec(text.substring(offset));
		if (!m) {
			throw "expected 'true' or 'false'";
		}
		return {
			func : function(context) {
				return !m[2];
			},
			lastIndex : offset + m[0].length
		};
	}

	function evalBoolExp(s, options) {
		var be = new abego.BoolExp(s, parseBoolLiteral, options);
		var result = be.exec(null);
		return result;
	}

	function allTests() {
		test("(internal) parseBoolLiteral", function() {
			var r;
			// parse 'true'
			r = parseBoolLiteral("true", 0, null);
			equal(4, r.lastIndex);
			strictEqual(true, r.func(null));

			// parse 'false'
			r = parseBoolLiteral("false", 0, null);
			equal(5, r.lastIndex);
			strictEqual(false, r.func(null));

			// parse 'true' with leading spaces and text following
			r = parseBoolLiteral("  true bla", 0, null);
			equal(6, r.lastIndex);
			strictEqual(true, r.func(null));

			// parse invalid term
			raises(function() {
				r = parseBoolLiteral("bla", 0, null);
			});
		});

		test("(internal) evalBoolExp", function() {
			equal(true, evalBoolExp("true"));
			equal(false, evalBoolExp("false"));
		});

		test("defaultOperationIs_OR option (abego.BoolExp)", function() {
			strictEqual(true, evalBoolExp("true true"));
			strictEqual(false, evalBoolExp("false false"));
			strictEqual(false, evalBoolExp("false true"));
			strictEqual(false, evalBoolExp("true false"));

			var options = {
				defaultOperationIs_OR : true
			};
			strictEqual(true, evalBoolExp("true true"), options);
			strictEqual(false, evalBoolExp("false false"), options);
			strictEqual(false, evalBoolExp("false true"), options);
			strictEqual(false, evalBoolExp("true false"), options);
		});

	}
	return {
		allTests : allTests
	};
})();
