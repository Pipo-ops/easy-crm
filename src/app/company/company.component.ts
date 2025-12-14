import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DialogAddCompanyComponent } from '../dialogs/dialog-add-company/dialog-add-company.component';
import { Company } from '../models/company.class'; 
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { inject } from '@angular/core'; 
import { Observable } from 'rxjs';
import { collectionData } from '@angular/fire/firestore';
import { AsyncPipe } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [
    RouterModule, 
    MatButtonModule, 
    MatIconModule,
    MatTooltipModule,  
    MatDialogModule,
    FormsModule,
    MatCardModule,
    AsyncPipe,
    CommonModule,
  ],
  templateUrl: './company.component.html',
  styleUrl: './company.component.scss',
})
export class CompanyComponent {

  company = new Company();
  allCompanies$: Observable<Company[]>; 
  firestore = inject(Firestore);

  constructor(public dialog: MatDialog, private router: Router) {
    const companyCollection = collection(this.firestore, 'companies');
    this.allCompanies$ = collectionData(companyCollection, { idField: 'id' }) as Observable<Company[]>;
  }

  openDialog() {
    this.dialog.open(DialogAddCompanyComponent)
  }

  goToCompany(companyId: string) {
    this.router.navigate(['/company-detail', companyId]);
  }
}
