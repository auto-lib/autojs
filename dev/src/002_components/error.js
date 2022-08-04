
let make_error = () => {

    let errors = {};

    let error = (name) => {
        if (!name) return errors;
        return (msg) => {
            if (!(name in errors)) errors[name] = [];
            errors[name].push(msg);
        }
    }

    return error;
}

module.exports = make_error;