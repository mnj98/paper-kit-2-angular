import { Component, OnInit } from '@angular/core';
import {Model} from "../components.component";
import {RequestSendService} from "../../request-send.service";
import {MatDialog} from "@angular/material/dialog";
import {MatSnackBar} from "@angular/material/snack-bar";
import {MatTabChangeEvent} from "@angular/material/tabs";
import {PromptDialogComponent} from "../../prompt-dialog/prompt-dialog.component";
import {DeleteConfirmationComponent} from "../../delete-confirmation/delete-confirmation.component";

const DEFAULT_STEPS: number = 75
const DEFAULT_SAMPLES: number = 1

//The following types are used to enforce some structure to the inter-component API
//Normal JavaScript does not allow for this, but we're using TypeScript

/**
 * Data transferred to prompt dialog component
 */
export interface PromptData {
    prompt_text: string
}

/**
 * Data transferred to delete dialog component
 */
export interface DeleteData {
    model_id: string,
    image_id: string
}

/**
 * Type that represents a saved image
 */
export interface SavedImage{
    image_id: string,
    image: string,
    prompt_text: string,
    rating: number,
    steps: number
}

/**
 * Type that represents a generated image
 */
export interface NewImage{
    image: string,
    rating: number,
    selected: boolean,
    steps: number
}

export interface GeneratedImages{
    prompt_text: string,
    images: [string],
    steps: number,
    timeout: boolean
}



@Component({
  selector: 'app-basicelements',
  templateUrl: './basicelements.component.html',
  styleUrls: ['./basicelements.component.scss']
})
export class BasicelementsComponent implements OnInit {
    active = 1
    //Fields for this component
    model: Model = {model_id: "", name: "", thumbnail: "", token: ""}
    prompt_text: string = ""
    saved_images: SavedImage[] = []
    before_init: boolean = true
    new_results: NewImage[] = []
    num_samples: number = DEFAULT_SAMPLES
    steps: number = DEFAULT_STEPS
    status_pending: boolean = false

    rating_nums: number[] = [1,2,3,4,5]
    sample_nums: number[] = [1,2,4]

    constructor(private req_service: RequestSendService,
                public dialog: MatDialog,
                private _snackBar: MatSnackBar) {}

    ngOnInit() {
        this.model = window.history.state.model
        //this.model = window.history.state.model
        this.getSavedImages(this.model.model_id)
        this.num_samples = DEFAULT_SAMPLES
        this.steps = DEFAULT_STEPS
        this.prompt_text = this.model.token
        this.before_init = false
    }

    /**
     * Run in a few places to clear the inputs
     */
    clear(){
        this.new_results = []
        this.prompt_text = ''
        this.num_samples = DEFAULT_SAMPLES
        this.steps = DEFAULT_STEPS
        this.prompt_text = this.model.token
        this.status_pending = false

    }

    /**
     * Opens the delete dialog component to get confirmation before deleting the selected image
     * @param model_id
     * @param image_id
     */
    deleteImage(model_id, image_id){
        this.dialog.open(DeleteConfirmationComponent, {
            data: {model_id: model_id, image_id: image_id}
        }).afterClosed().subscribe({next: () => {
                this.getSavedImages(model_id)
            }})
    }

    /**
     * Reloads generated images from back-end when the tab is changed.
     * @param event
     * @param model_id
     */
    tabChangeToHistory(event: MatTabChangeEvent, model_id){
        if(event.index == 1) this.getSavedImages(model_id)
    }

    /**
     * Gets generated images from back-end
     * @param model_id
     */
    getSavedImages(model_id){
        console.log(model_id)
        this.req_service.getGeneratedImages(model_id).subscribe({next: result => {

                this.saved_images = result.output
                console.log('saved images ' + this.saved_images)
            }, error: console.log})
    }

    /**
     * Saves all images that have been selected
     */
    saveImages(){
        //This filters out non-selected images. Then it maps to a slimmed-down object that only has required fields.
        let images = this.new_results.filter((image) => {
            return image.selected
        }).map(image => {
            return {image: image.image, rating: image.rating, steps: image.steps}
        })

        //Use api to save. After reload and clear.
        this.req_service.saveImages(this.model.model_id, images, this.prompt_text).subscribe({next: () => {
                this.getSavedImages(this.model.model_id)
                this.clear()
            }, error: console.log})
    }

    /**
     * Updates samples
     * @param button_index
     */
    onSelectNumSamples(button_index){
        this.num_samples = this.sample_nums[button_index]
    }

    /**
     * Used to disable save button when nothing is selected
     */
    any_selected(){
        return this.new_results.some(image => image.selected)
    }

    /**
     * Used to select or un-select a generated image
     * @param image_index
     */
    change_generated_image_selection(image_index:number){
        this.new_results[image_index].selected = !this.new_results[image_index].selected
    }

    /**
     * Submits a request
     * @param prompt
     * @param num_samples
     * @param steps
     */
    clickPrompt(prompt: string, num_samples: number, steps: number){
        //Edge case handling, probably not needed?
        if(!prompt || prompt.length == 0){
            this.clear()
        }
        else {
            //init loading bar with pending status
            this.status_pending = true
            //Send generate image request to back-end
            this.req_service.genImages(prompt, this.model.model_id, num_samples, steps).subscribe({
                next: result => {
                    //Display timeout info
                    if(result.timeout){
                        this._snackBar.open("Request Timed Out", 'ok',{horizontalPosition: "center", verticalPosition: 'bottom'})
                        this.new_results = []
                        this.status_pending = false

                    }
                    //Set new results so they get displayed
                    else {
                        this.new_results = result.images.map((image) => {
                            return {image: image, rating: 0, selected: false, steps: result.steps}
                        })
                        this.prompt_text = result.prompt_text

                        this.status_pending = false
                    }
                }, error: console.log
            })



        }
    }

    /**
     * Open prompt dialog component
     * @param prompt_text
     */
    showPrompt(prompt_text:string){
        this.dialog.open(PromptDialogComponent, {
            data: {
                prompt_text: prompt_text
            }
        })
    }



    /**
     * Thanks ChatGPT :)
     * @param model_name: string
     * @param image_data: string
     */
    downloadImage(model_name, image_data){
        const byteString = atob(image_data);
        const mimeString = 'jpg'
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = model_name + '.jpg';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Shows the correct star for the specific rating
     * @param index
     * @param image_index
     */
    showIcon(index:number, image_index:number) {
        if(this.new_results[image_index].rating == null) return 'star_border'
        if (this.new_results[image_index].rating >= index + 1) {
            return 'star';
        } else {
            return 'star_border';
        }
    }

    /**
     * Updates rating
     * @param rating
     * @param image_index
     */
    onRate(rating:number, image_index:number){
        if(this.new_results[image_index].rating != 0 && this.new_results[image_index].rating == rating) this.new_results[image_index].rating = 0
        else this.new_results[image_index].rating = rating
    }

}
