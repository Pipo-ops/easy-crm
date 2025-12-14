import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Firestore, getDoc } from '@angular/fire/firestore';
import { deleteDoc, doc } from '@angular/fire/firestore';
import { Company } from '../models/company.class';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { DialogEditCompanyComponent } from '../dialogs/dialog-edit-company/dialog-edit-company.component';
import { DialogEditAddressComponent } from '../dialogs/dialog-edit-address/dialog-edit-address.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.scss',
})
export class CompanyDetailComponent implements OnInit {
  company: Company = new Company();
  companyId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private firestore: Firestore,
    public dialog: MatDialog,
    private router: Router
  ) {}

  async ngOnInit() {
    this.route.paramMap.subscribe(async (paramMap) => {
      this.companyId = paramMap.get('id');
      if (this.companyId) {
        let companyDocRef = doc(this.firestore, `companies/${this.companyId}`);
        let companySnap = await getDoc(companyDocRef);
        if (companySnap.exists()) {
          this.company = companySnap.data() as Company;
        } else {
          console.error('User not found!');
        }
      }
    });
  }

  editCompanyDetail() {
    const dialogRef = this.dialog.open<DialogEditCompanyComponent>(
      DialogEditCompanyComponent
    );
    dialogRef.componentInstance.company = this.company;
    dialogRef.componentInstance.companyId = this.companyId!;
  }

  async deleteCompanyDetail() {
    if (!this.companyId) return;

    const companyDocRef = doc(this.firestore, `companies/${this.companyId}`);
    await deleteDoc(companyDocRef);
    this.router.navigate(['/company']);
  }

  editAddressMenu() {
    const dialogRef = this.dialog.open<DialogEditAddressComponent>(
      DialogEditAddressComponent
    );
    dialogRef.componentInstance.company = this.company;
    dialogRef.componentInstance.companyId = this.companyId!;
  }
}
