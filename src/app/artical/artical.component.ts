import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { deleteDoc } from '@angular/fire/firestore';
import { DialogEditArticleComponent } from '../dialogs/dialog-edit-article/dialog-edit-article.component';


import { ActivatedRoute } from '@angular/router';
import {
  Firestore,
  doc,
  docData,
  collection,
  collectionData,
} from '@angular/fire/firestore';
import { combineLatest, map, switchMap, shareReplay } from 'rxjs';

import { DialogAddArticleComponent } from '../dialogs/dialog-add-article/dialog-add-article.component';

type Category = { id: string; name: string; image?: string };
type Article = { id: string; name: string; image?: string };

@Component({
  selector: 'app-artical',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './artical.component.html',
  styleUrl: './artical.component.scss',
})
export class ArticalComponent {
  private fs = inject(Firestore);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);

  vm$ = this.route.paramMap.pipe(
    map((p) => p.get('id')!),
    switchMap((id) => {
      const catRef = doc(this.fs, 'categories', id);
      const artsRef = collection(catRef, 'articles');
      return combineLatest({
        category: docData(catRef, { idField: 'id' }) as any,
        articles: collectionData(artsRef, { idField: 'id' }) as any,
      }).pipe(
        map(({ category, articles }) => ({
          categoryId: id,
          category: category as Category,
          articles: (articles as Article[]).sort((a, b) =>
            a.name.localeCompare(b.name)
          ),
        })),
        shareReplay(1)
      );
    })
  );

  trackById = (_: number, item: { id: string }) => item.id;

  openDialog() {
    const categoryId = this.route.snapshot.paramMap.get('id')!;
    this.dialog.open(DialogAddArticleComponent, {
      width: '560px',
      data: { categoryId },
    });
  }

  viewArticle(article: any) {
    // optional: später Detail-Popup oder Route öffnen
    console.log('view', article);
  }

  editArticle(categoryId: string, article: any) {
    this.dialog.open(DialogEditArticleComponent, {
      width: '560px',
      data: { categoryId, article },
    });
  }

  async deleteArticle(categoryId: string, article: any) {
    if (!confirm(`Artikel „${article.name}“ wirklich löschen?`)) return;
    await deleteDoc(
      doc(this.fs, `categories/${categoryId}/articles/${article.id}`)
    );
  }
}
