load(__dirname + '/testlib/requireme.js');

describe("Loading dependencies", function() {
	it("should have access to loaded file's exposed variables", function() {
		expect(requireme).toBeTruthy();
	});
});
