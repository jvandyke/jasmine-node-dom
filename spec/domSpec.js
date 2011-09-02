
describe("DOM", function() {
	it("should have access to the window object", function() {
		expect(window).toBeDefined();
	});
	
	it("should have access to the document object", function() {
		expect(document).toBeDefined();
	});
	
	it("should place the document object on the window", function() {
		expect(window.document).toBeDefined();
		expect(window.document).toBe(document);
	});
	
	it("should allow querying on the document", function() {
		var head = document.getElementsByTagName("head");
		expect(head).toBeDefined();
	});
});
