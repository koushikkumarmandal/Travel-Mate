class ExpressError{
    constructor(statusCode,message){
        Super();
        this.statusCode=statusCode;
        this.message=message;
    }
}

module.exports=ExpressError;