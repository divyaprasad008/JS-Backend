class ApiError extends Error{
    constructor(
        statusCode,
        message = "Something Went Wrong",
        errors = [],
        stack = ""
    ){
        super(mesasge)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors

        if(stack){
            this.stack = stack
        }
        else{
            ERROR.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}