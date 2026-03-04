export class User{
    id: string;
    user: string;
    firstName: string;
    lastName: string;
    email: string;
    birthDate?: number;

    constructor(obj?: any) {
        this.id = obj?.id || '';
        this.user = obj ? obj.user : '';
        this.firstName = obj ? obj.firstName :'';
        this.lastName = obj ? obj.lastName : '';
        this.email = obj ? obj.email : '';
        this.birthDate = obj ? obj.birthDate : '';
    }
}