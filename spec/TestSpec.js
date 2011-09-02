describe('jasmine-node-flat', function(){
  it('should print from parent suite', function(){
    expect(1+2).toEqual(3);
  });
  
  describe("Nested", function() {
  	it("should print from child suite", function() {
  		expect(2).toEqual(2);
  	});
  });
});
