import { Component, OnInit, Renderer2 } from '@angular/core';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import {Router} from "@angular/router";
import {RequestSendService} from "../request-send.service";

/**
 * Exported type for models. Fields are self-explanatory.
 */
export interface Model{
    model_id: string,
    name: string,
    thumbnail: string,
    token: string
}


@Component({
    selector: 'app-components',
    templateUrl: './components.component.html',
    styles: [`
    ngb-progressbar {
        margin-top: 5rem;
    }
    `]
})



export class ComponentsComponent implements OnInit {

    trained_models: [Model] = [{model_id: "", name: "", thumbnail: "", token: ""}]
    loaded_models: boolean = false



    page = 4;
    page1 = 5;
    focus;
    focus1;
    focus2;
    date: {year: number, month: number};
    model: NgbDateStruct;
    constructor( private renderer : Renderer2,
                 private router: Router,
                 private req_service: RequestSendService) {}
    isWeekend(date: NgbDateStruct) {
        const d = new Date(date.year, date.month - 1, date.day);
        return d.getDay() === 0 || d.getDay() === 6;
    }

    isDisabled(date: NgbDateStruct, current: {month: number}) {
        return date.month !== current.month;
    }

    ngOnInit() {
        this.req_service.getTrainedModels().subscribe({next: (models) => {
                this.trained_models = models.models
                this.loaded_models = true
                console.log(this.trained_models)
            }, error: console.log})
        let input_group_focus = document.getElementsByClassName('form-control');
        let input_group = document.getElementsByClassName('input-group');
        for (let i = 0; i < input_group.length; i++) {
            input_group[i].children[0].addEventListener('focus', function (){
                input_group[i].classList.add('input-group-focus');
            });
            input_group[i].children[0].addEventListener('blur', function (){
                input_group[i].classList.remove('input-group-focus');
            });
        }
    }

    selectModel(model: Model): void{
        console.log(model)
        this.router.navigate(['/generate'], {state: {model: model}})
    }

}
