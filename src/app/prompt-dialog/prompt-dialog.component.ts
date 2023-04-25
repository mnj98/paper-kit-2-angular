import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {PromptData} from "../components/basicelements/basicelements.component";

@Component({
  selector: 'app-prompt-dialog',
  templateUrl: './prompt-dialog.component.html',
  styleUrls: ['./prompt-dialog.component.css']
})
export class PromptDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: PromptData) {}
}
