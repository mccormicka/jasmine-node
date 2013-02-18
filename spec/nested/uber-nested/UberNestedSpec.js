describe('jasmine-node-uber-nested', function(){
  it('should pass', function(){
    expect(1+2).toEqual(3);
  });

  describe('success', function(){
    it('should report success', function(){
      expect(true).toBeTruthy();
    });
  });
});
